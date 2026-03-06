/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix para pptxgenjs y docx: ignorar módulos node: en el bundle del cliente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
      }
      // Plugin para manejar scheme "node:" que webpack 5 no soporta por defecto
      config.plugins.push(
        new (class {
          apply(compiler) {
            compiler.hooks.normalModuleFactory.tap('IgnoreNodeScheme', (nmf) => {
              nmf.hooks.beforeResolve.tap('IgnoreNodeScheme', (result) => {
                if (!result) return
                if (/^node:/.test(result.request)) {
                  result.request = result.request.replace(/^node:/, '')
                }
              })
            })
          }
        })()
      )
    }
    return config
  },
};

export default nextConfig;
