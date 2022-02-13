import { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Channel, ChannelID, Channels } from '../../structs/channels'
import useSWR from 'swr'

import pageStyles from '../../styles/page.module.scss'
import styles from '../../styles/pages/Channel.module.scss'
import { classes, getYouTubeId } from '../../utils/string'
import ProgressBar from '../../components/ProgressBar'
import Image from 'next/image'
import { TabButton, TabGroup } from '../../components/Tabs'
import { useState } from 'react'
import { APIResponse } from '../../structs/api'
import { VideoWithCaption } from '../../structs/airtable'
import VideoCard from '../../components/VideoCard'
import { LoadSpinner } from '../../components/Loading'

interface ChannelCardProps {
  channel: Channel
}

const ChannelCard = ({ channel }: ChannelCardProps) => {
  return (
    <div className={styles.channelCard}>
      <div className={styles.contents}>
        <div className={styles.member}>
          <div className={styles.image}>
            <Image
              src={channel.image}
              alt={channel.name}
              width={75}
              height={75}
            />
          </div>
          <h1 className={styles.name}>{channel.name}</h1>
        </div>
        <div className={styles.progress}>
          <ProgressBar barStyle='primary' progress={0.46}></ProgressBar>
        </div>
      </div>
    </div>
  )
}

const fetchList = async (url: string) =>
  fetch(url)
    .then(res => (res.json() as unknown) as APIResponse<VideoWithCaption[]>)
    .then(v => {
      if (v.status === 'error') {
        throw new Error(v.message)
      }

      return v.data
    })

interface ChannelPageProps {
  id: ChannelID
}

const ChannelPage: NextPage<ChannelPageProps> = ({ id }) => {
  const router = useRouter()
  const [tabIndex, setTabIndex] = useState<number>(1)
  const { data, error } = useSWR(`/api/lists?id=${id}`, fetchList)

  return (
    <div className={styles.container}>
      <Head>
        <title>감람스톤</title>
      </Head>
      <div className={pageStyles.page}>
        <div className={classes(pageStyles.contents)}>
          <ChannelCard
            channel={Channels[router.query.id as ChannelID]}
          ></ChannelCard>
        </div>
        <div className={classes(pageStyles.contents)}>
          <TabGroup activeIndex={tabIndex} setActiveIndex={setTabIndex}>
            <TabButton key='all'>전체</TabButton>
            <TabButton key='waiting'>업로드 대기 중</TabButton>
            <TabButton key='done'>업로드 완료</TabButton>
            <TabButton key='ongoing'>번역 진행 중</TabButton>
          </TabGroup>
        </div>
        <div className={classes(pageStyles.contents, styles.lists)}>
          {!data ? (
            <LoadSpinner></LoadSpinner>
          ) : data.length ? (
            data.map(video => (
              <VideoCard
                key={video.id}
                title={video.title}
                youtubeId={getYouTubeId(video.url)}
              ></VideoCard>
            ))
          ) : (
            <div className={styles.empty}>아무런 영상이 없어요.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: Object.keys(Channels).map(v => ({ params: { id: v } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = ({ params }) => {
  return {
    props: {
      id: params && params.id,
    },
  }
}

export default ChannelPage
