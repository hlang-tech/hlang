import react from '@vitejs/plugin-react'
import { viteExternalsPlugin } from "vite-plugin-externals";
import dts from 'vite-plugin-dts';

export default ({ command }) => {
  // 在 Qi平台部署的配置。 也支持本地build 之后 `vite preview`
  const config = {
    jsx: 'react',
    root: './example',
    build: {
      outDir: './dist',
      lib: {
        entry: "./index.tsx",
        name: "@hlang-nodes/hlang-component",
        fileName: 'index',
      },
      rollupOptions: {
        external: ["react", "react-dom", 'antd', '@ant-design/pro-components'],
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            '@ant-design/pro-components': 'ProComponents',
            antd: 'antd',
          },
        },
      },
      sourcemap: true,
      emptyOutDir: true,
    },
    plugins: [
      react(),
      viteExternalsPlugin({
        react: 'React',
        'react-dom': 'ReactDOM',
        '@ant-design/pro-components': 'ProComponents',
         antd: 'antd',
      }),
      dts()
    ]
  }

  if (command === 'build') {
    config.root = './';
  }

  return config;
};

