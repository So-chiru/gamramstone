import { NextPage } from 'next'
import Head from 'next/head'

import pageStyles from '../styles/page.module.scss'
import styles from '../styles/pages/Main.module.scss'
import { classes } from '../utils/string'
import Logo from '../components/Logo'

const Privacy: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>감람스톤</title>
      </Head>
      <div className={pageStyles.page}>
        <div className={classes(pageStyles.contents, styles.heading)}>
          <div className={styles.inner}>
            <span>이세돌 - 왁타버스 번역 프로젝트</span>
            <div className={styles.logo}>
              <Logo size={32} stroke={3}></Logo>
              <span>감람스톤</span>
            </div>
            <span>개인정보처리방침</span>
          </div>
        </div>
        <div className={classes(pageStyles.contents)}>
          <p>안녕하세요.</p>
        </div>
      </div>
    </div>
  )
}

export default Privacy
