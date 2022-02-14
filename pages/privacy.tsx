import { NextPage } from 'next'
import Head from 'next/head'

import pageStyles from '../styles/page.module.scss'
import styles from '../styles/pages/Main.module.scss'
import { classes } from '../utils/string'
import Logo from '../components/Logo'
import { Channel, ChannelID, Channels } from '../structs/channels'
import Image from 'next/image'
import Link from 'next/link'

interface ChannelCardProps {
  channel: Channel
}

const ChannelCard = ({ channel }: ChannelCardProps) => {
  return (
    <div className={styles.card} data-id={channel.id}>
      <div className={styles.cardContents}>
        <div className={styles.image}>
          <Image
            src={channel.image}
            alt={channel.name}
            width={150}
            height={150}
          />
        </div>
        <div className={styles.name}>
          <p>{channel.name}</p>
        </div>
      </div>
    </div>
  )
}

const Main: NextPage = () => {
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

export default Main
