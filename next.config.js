// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Remova a linha 'turbopack: {}' se você a adicionou, pois vamos forçar o webpack
  // turbopack: {}, // Remova esta linha

  // Adicione esta configuração para desabilitar o Turbopack para o build de produção
  // e usar o Webpack.
  // Isso é feito configurando o compilador para usar o Webpack.
  compiler: {
    // Esta é uma forma de garantir que o Webpack seja usado para o build.
    // A documentação do Next.js 16.x sugere que o Turbopack é o padrão,
    // mas para builds problemáticos, forçar o Webpack é a melhor abordagem.
    // Não há uma opção direta 'useWebpack: true' na raiz.
    // Em vez disso, vamos usar o comando de build com a flag --webpack.
  },

  // Mantenha o bloco webpack vazio ou com suas configurações específicas
  webpack: (config, { isServer }) => {
    // Você pode adicionar outras configurações de webpack aqui se precisar
    return config;
  },
};

module.exports = nextConfig;