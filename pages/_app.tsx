import '../styles/globals.scss'
import 'normalize.css'

import { AppProps } from 'next/app'
import { RecoilRoot } from 'recoil'

import { motion } from 'framer-motion'
import Header from '../components/Header'
import { Toaster } from 'react-hot-toast'
import Head from 'next/head'

const variants = {
  hidden: { opacity: 0 },
  enter: { opacity: 1 },
  exit: { opacity: 0 },
}

function MyApp ({ Component, pageProps, router }: AppProps) {
  return (
    <RecoilRoot>
      <Head>
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='32x32'
          href='/favicon-32x32.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='16x16'
          href='/favicon-16x16.png'
        />
        <link rel='manifest' href='/site.webmanifest' />
      </Head>
      <Header></Header>
      <Toaster position='top-center'></Toaster>
      <motion.div
        key={router.route}
        variants={variants}
        className={'page-wrapper'}
        initial='hidden'
        animate='enter'
        exit='exit'
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Component {...pageProps} />
      </motion.div>
    </RecoilRoot>
  )
}

export default MyApp
