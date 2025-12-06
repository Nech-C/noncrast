import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    // Unpack native binaries so Node can load .node files (e.g., better-sqlite3, onnxruntime) at runtime
    asar: 
    {
      // Also unpack the ML worker bundle so worker_threads can load it from disk
      unpack: '{**/*.node,**/mlWorker.js,**/mlWorker.cjs}',
      // Unpack the whole .vite directory (contains mlWorker bundle) since minimatch ignores dot dirs by default
      // Also unpack native deps used by the ML worker
      unpackDir: '{.vite,node_modules/onnxruntime-node,node_modules/onnxruntime-common,node_modules/sharp,node_modules/@img}',
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
        {
          // ML worker build (outputs .vite/build/mlWorker.js)
          entry: 'src/mlWorker.js',
          config: 'vite.worker.config.mts',
          target: 'main',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Ensure native modules (e.g., better-sqlite3) are unpacked when packaging
    new AutoUnpackNativesPlugin({}),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: { owner: 'Nech-C', name: 'noncrast' },
        prerelease: false,
        draftRelease: false,
      },
    },
  ],
  hooks: {
    /**
     * Vite bundles almost everything, so node_modules are stripped during packaging.
     * Copy native runtime deps (better-sqlite3, onnxruntime-node) along with their
     * dependency trees into the packaged app so require() can resolve them at runtime.
     */
    packageAfterCopy: async (_forgeConfig, buildPath) => {
      const fs = await import('fs/promises');
      const path = await import('node:path');
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);

      const nativeDeps = ['better-sqlite3', 'onnxruntime-node', 'sharp'];
      const visited = new Set<string>();

      const copyWithDeps = async (dep: string) => {
        if (visited.has(dep)) return;
        visited.add(dep);

        try {
          // Resolve the package.json first (works for ESM and type-only packages)
          const pkgJsonPath = require.resolve(path.join(dep, 'package.json'), {
            paths: [path.resolve(__dirname, 'node_modules')],
          });

          const pkgRoot = path.dirname(pkgJsonPath);
          const pkgJson = JSON.parse(
            await fs.readFile(pkgJsonPath, 'utf-8'),
          );

          // Skip type-only packages to avoid MODULE_NOT_FOUND for missing JS entry points
          const typesOnly =
            dep.startsWith('@types/') ||
            (!pkgJson.main && !pkgJson.module && !pkgJson.exports && pkgJson.types);
          if (typesOnly) return;

          const dest = path.join(buildPath, 'node_modules', dep);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.cp(pkgRoot, dest, { recursive: true, force: true });

          const deps = {
            ...pkgJson.dependencies,
            ...pkgJson.optionalDependencies, // pull in platform-specific binaries (e.g., @img/sharp-win32-x64)
          };

          for (const child of Object.keys(deps ?? {})) {
            await copyWithDeps(child);
          }
        } catch (err) {
          console.warn(`[forge hook] failed to copy ${dep}:`, err);
        }
      };

      for (const dep of nativeDeps) {
        await copyWithDeps(dep);
      }
    },
  },
};

export default config;
