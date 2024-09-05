import { Icon } from '@alifd/next';
export const content =  {
  menu: [
    {
      title: 'Home',
      url: '#',
    },
    {
      title: 'Hlang docs',
      url: '#',
    },
  ],
  banner: {
    title: 'Taking the next step in programming',
    subtitle: 'Hlang aims to make programming easier, faster and more comfortable. It avoids coding, repetition and frustration.',
    btnList: [
      {
        text: 'Try Hlang now',
        url: '/list',
      },
    ],
  },
  guide: [
    {
      icon: 'icon-tutorials',
      title: 'Tutorials',
      subtitle: 'Learn how Hlang works and build your first programs.',
      btnText: 'Subscribe for updates ',
      btnLink: '#',
    },
    {
      icon: 'icon-Documentation',
      title: 'Documentation',
      subtitle: 'Read the docs for more details about operators.',
      btnText: 'Subscribe for updates ',
      btnLink: '#',
    },
    {
      icon: 'icon-Examples',
      title: 'Examples',
      subtitle: 'Explore examples to get a idea what you can build with Hlang.',
      btnText: 'Subscribe for updates ',
      btnLink: '#',
    },
  ],
  features: {
    title: 'Features',
    subtitle: 'Have a look at what makes Hlang special',
    list: [
      {
        icon: 'icon-coding',
        title: 'No coding required',
        subtitle: 'PURELY VISUAL PROGRAMMING',
        des: 'There is no need to use cryptic text-based programming languages when your program could as well be structured completely visually. Hlang uses purely visual elements such as boxes and arrows to represent programs.',
      },
      {
        icon: 'icon-Savetime',
        title: 'Save time',
        subtitle: 'CONVENIENT AND STRAIGHTFORWARD',
        des: "Programming doesn't need to be complicated and time-consuming. It can be convenient and straightforward without losing any of its powerfulness and flexibility. With Hlang, we detached programming from the way computers work to come closer to how we think. Let's make the computer our tool again and not subject our thinking to a 70 years old computer architecture!",
      },
      {
        icon: 'icon-operators',
        title: 'Tons of operators',
        subtitle: 'GROWING EVERY DAY',
        des: 'Hlang operators can perform all kinds of tasks from the very simplest to the most complex. Everyone can create new operators without coding and share them with the community - just by composing other operators! Explore our Hlang world of operators which grows every day.',
      },
    ],
  },
  cases: {
    title: 'Use cases',
    subtitle: 'Achieve this and much more in a matter of minutes',
    list: [
      {
        icon: 'icon-Build',
        title: 'Build and use APIs',
        subtitle: 'Write web interfaces or query them',
      },
      {
        icon: 'icon-Process',
        title: 'Process any data',
        subtitle: 'Process almost any kind of data or perform statistical analysis',
      },
      {
        icon: 'icon-Visualize',
        title: 'Visualize data',
        subtitle: 'Create charts and perform other kinds of data visualization',
      },
      {
        icon: 'icon-files',
        title: 'Process all kinds of files',
        subtitle: 'Handle Excel files, CSV files and many more formats',
      },
      {
        icon: 'icon-databases',
        title: 'Query databases',
        subtitle: 'Use database management systems',
      },
      {
        icon: 'icon-Share',
        title: 'Share operators',
        subtitle: 'Allow others to use an operator you created',
      },
      {
        icon: 'icon-Connect',
        title: 'Connect other services',
        subtitle: 'Be it cloud services, web services or other kinds of services',
      },
      {
        icon: 'icon-workflows',
        title: 'Automate workflows',
        subtitle: 'Automate processes you currently perform manually',
      },
    ],
  },
  footer: {
    introduction: 'We are building solutions that help bridge the gap between human thinking and computer language.',
    copyright: '© Copyright 2020. All rights reserved.',
    menu: [
      {
        title: 'HSET',
        url: '#',
        childrens: [
          {
            title: 'HCM',
            url: 'https://hcm.hemaos.com/',
          },
          {
            title: 'Hlang',
            url: '#',
          },
          {
            title: 'More',
            url: '#',
          },
        ],
      },
      {
        title: 'HELP',
        childrens: [
          {
            title: "Beginner's guide",
            url: '#',
          },
          {
            title: 'Doc',
            url: '#',
          },
        ],
      },
    ],
  },
};

export const MyIcons = Icon.createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_1983733_w2fvjine37.js',
});
