import { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import Head from 'next/head'
import { Channel, ChannelID, Channels } from '../../structs/channels'
import useSWR from 'swr'

import pageStyles from '../../styles/page.module.scss'
import styles from '../../styles/pages/Channel.module.scss'
import { classes, getYouTubeId } from '../../utils/string'
import { TabButton, TabGroup } from '../../components/Tabs'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import {
  ChannelStat,
  LanguageCode,
  TranslatedVideoMetadata,
  VideoWithCaption,
  WorkStatus,
} from '../../structs/common'
import { LoadSpinner } from '../../components/Loading'
import VideoProjectCard from '../../components/VideoCard'
import FadeInImage from '../../components/FadeInImage'
import { Button } from '../../components/Button'
import ProcessPopup, { getVideoWorks } from '../../components/ProcessPopup'
import toast from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Footer from '../../components/Footer'

import getConfig from 'next/config'
import { isUploadable } from '../../utils/client/requests'
import CaptionPreview from '../../components/CaptionPreview'
import ProgressBar from '../../components/ProgressBar'
import { useTranslation } from 'react-i18next'
import ErrorComponent from '../../components/Error'
import { APIResponse } from '../../structs/api'

const { publicRuntimeConfig } = getConfig()

interface ChannelCardProps {
  channel: Channel
  stat?: ChannelStat
}

const ChannelCard = ({ channel, stat }: ChannelCardProps) => {
  const { t } = useTranslation()

  return (
    <div className={styles.channelCard}>
      <div className={styles.contents}>
        <div className={styles.member}>
          <div className={styles.image}>
            <FadeInImage src={channel.image} width={75} height={75} />
          </div>
          <h1 className={styles.name}>{channel.name}</h1>
        </div>
        {(stat && (
          <div className={styles.progress}>
            <ProgressBar
              barStyle='primary'
              progress={stat.uploaded / (stat.uploaded + stat.waiting)}
            ></ProgressBar>
            <div className={styles.text}>
              <p>
                {t('tracks.uploaded', {
                  counts: stat.uploaded,
                })}
              </p>
              <p>
                {t('tracks.waiting', {
                  counts: stat.waiting,
                })}
              </p>
            </div>
          </div>
        )) || (
          <div className={styles.progress}>
            <ProgressBar barStyle='primary' progress={0}></ProgressBar>
            <div className={styles.text}>{t('tracks.loading')}</div>
          </div>
        )}
      </div>
    </div>
  )
}

const useColor = (id: string) => {
  useEffect(() => {
    const elem = document.body

    const obj: Record<string, string> = {
      '--color-primary': `var(--${id}-color-primary)`,
      '--color-on-primary': `var(--${id}-color-on-primary)`,
      '--color-primary-container': `var(--${id}-color-primary-container)`,
      '--color-on-primary-container': `var(--${id}-color-on-primary-container)`,
      '--color-secondary': `var(--${id}-color-secondary)`,
      '--color-on-secondary': `var(--${id}-color-on-secondary)`,
      '--color-secondary-container': `var(--${id}-color-secondary-container)`,
      '--color-on-secondary-container': `var(--${id}-color-on-secondary-container)`,
      '--color-tertiary': `var(--${id}-color-tertiary)`,
      '--color-on-tertiary': `var(--${id}-color-on-tertiary)`,
      '--color-tertiary-container': `var(--${id}-color-tertiary-container)`,
      '--color-on-tertiary-container': `var(--${id}-color-on-tertiary-container)`,
      '--color-error': `var(--${id}-color-error)`,
      '--color-on-error': `var(--${id}-color-on-error)`,
      '--color-error-container': `var(--${id}-color-error-container)`,
      '--color-on-error-container': `var(--${id}-color-on-error-container)`,
      '--color-outline': `var(--${id}-color-outline)`,
      '--color-background': `var(--${id}-color-background)`,
      '--color-on-background': `var(--${id}-color-on-background)`,
      '--color-surface': `var(--${id}-color-surface)`,
      '--color-on-surface': `var(--${id}-color-on-surface)`,
      '--color-surface-variant': `var(--${id}-color-surface-variant)`,
      '--color-on-surface-variant': `var(--${id}-color-on-surface-variant)`,
      '--color-inverse-surface': `var(--${id}-color-inverse-surface)`,
      '--color-inverse-on-surface': `var(--${id}-color-inverse-on-surface)`,
    }

    Object.keys(obj).forEach(key => {
      elem.style.setProperty(key, obj[key])
    })

    return () => {
      Object.keys(obj).forEach(key => {
        elem.style.removeProperty(key)
      })
    }
  }, [id])
}

const fetchData = async <T extends unknown>(url: string): Promise<T> =>
  fetch(url)
    .then(async res => {
      let data: unknown
      let parsable = true

      try {
        data = await res.json()
      } catch (e) {
        parsable = false
      }

      if (parsable) {
        return data as APIResponse<T>
      }

      if (res.status === 502) {
        throw new Error('502 Bad Gateway, ?????? ?????? ?????? ??????????????????...')
      }

      if (res.status === 503 || res.status === 504) {
        throw new Error('504 Gateway Timeout, ???????????? ??????????????? ??????')
      }

      if (res.status === 500) {
        throw new Error(
          '500 Internal Server Error, ?????? ???????????? ?????? ??????????????????...'
        )
      }

      if (!res.ok) {
        throw new Error(
          `${res.status > 500 ? '??????' : '??????'} ??????, ????????? ${res.status} ${
            res.statusText
          } ???(???) ?????????????????????.`
        )
      }

      return data as APIResponse<T>
    })
    .then(v => {
      if (v.status === 'error') {
        throw new Error(`??????: ${v.message}`)
      }

      return v.data as T
    })

interface ChannelPageProps {
  id: ChannelID
}

const Tabs: WorkStatus[] = ['waiting', 'done', 'wip']

const RandomImages = ({ id }: { id: ChannelID }) => {
  const randomValue = Math.random()
  const { t } = useTranslation()

  const [ratio, setRatio] = useState(1)

  return (
    <>
      <div className={styles.image}>
        <FadeInImage
          src={
            EmptyImages[id][Math.floor(randomValue * EmptyImages[id].length)] ||
            '/empty.png'
          }
          layout='fixed'
          alt='no image'
          width={150}
          height={150 * ratio}
          onLoadingComplete={result =>
            setRatio(result.naturalHeight / result.naturalWidth)
          }
        ></FadeInImage>
      </div>
      <h3>
        {EmptyTexts[id][Math.floor(randomValue * EmptyTexts[id].length)] ||
          t('empty_videos')}
      </h3>
    </>
  )
}

const EmptyImages: Record<ChannelID, string[]> = {
  wakgood: ['/clear/wakgood-001.gif'],
  waktaverse: ['/clear/waktaverse-001.webp'],
  ine: ['/clear/ine-001.webp', '/clear/ine-002.webp'],
  jingburger: ['/clear/jingburger-001.webp'],
  lilpa: ['/clear/lilpa-001.jpg'],
  jururu: ['/clear/jururu-001.webp', '/clear/jururu-002.webp'],
  gosegu: ['/clear/gosegu-001.webp'],
  viichan: ['/clear/viichan-001.png', '/clear/viichan-002.png'],
}

const EmptyTexts: Record<ChannelID, ReactNode[]> = {
  wakgood: ['????????? ?????? ??????~', '????????????????????? ???????????????'],
  waktaverse: ['?????? ????????? ?????????~'],
  ine: ['?????? ????????? ??????~ ????????????'],
  jingburger: ['?????? ???????????? ??????...! ???????????????~'],
  lilpa: ['?????? ?????? ?????????! ???????????????~', '?????????'],
  jururu: [
    '????????? ??????... ?????? ????????????...?',
    '????????? ??????????????????... ????????? ???????????????...... ???..????????? ???????????? ????????????..!!!!',
    '?????? ?????? ??????',
  ],
  gosegu: ['?????? ????????? ??????! ???????????????~ ??????~~~ ^???^'],
  viichan: [
    '???????????? ?????? ????????? ??????~ ???????????????~',
    <span key='no-movie' className={styles.tanoshii}>
      ?????? ??????
    </span>,
  ],
}

const ChannelPage: NextPage<ChannelPageProps> = ({ id }) => {
  const [tabIndex, setTabIndex] = useState<number>(0)
  const { data, error, mutate } = useSWR<VideoWithCaption[]>(
    `/api/lists?id=${id}&tabs=${Tabs[tabIndex]}`,
    fetchData
  )

  const { t, i18n } = useTranslation()

  const { data: statData, error: statError } = useSWR<ChannelStat>(
    `/api/stats?id=${id}`,
    fetchData
  )

  const { data: session } = useSession()
  const [openProcessPopup, setOpenProcessPopup] = useState<boolean>(false)
  const [needPermission, setNeedPermission] = useState<boolean>(false)

  useColor(id)

  /**
   * URL??? #apply??? ???????????? ????????? ???????????? ????????? ????????????.
   */
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.hash === '#apply' &&
      session?.permissionGranted
    ) {
      setOpenProcessPopup(true)
      window.location.hash = ''
    }
  }, [session?.permissionGranted])

  useEffect(() => {
    document.documentElement.dataset.memberScheme = id

    return () => {
      document.documentElement.dataset.memberScheme = ''
    }
  }, [id])

  const onUpload = useCallback(
    (videos: [string, LanguageCode][]) => {
      if (!data) {
        return
      }

      mutate(
        data.map(v => {
          const filtered = videos.filter(
            data => data[0] === getYouTubeId(v.url)
          )

          if (filtered.length > 0) {
            return {
              ...v,
              captions: v.captions.map((c: TranslatedVideoMetadata) =>
                filtered.filter(d => d[1] === c.language).length > 0
                  ? {
                      ...c,
                      status: 'done',
                    }
                  : c
              ),
            } as VideoWithCaption
          }

          return v
        }),
        false
      )
    },
    [data, mutate]
  )

  return (
    <div className={styles.container}>
      <Head>
        <title>
          {Channels[id].name} - {t('gamramstone')}
        </title>
        <meta
          name='description'
          content={t('channel_seo', {
            channel: Channels[id].name,
          })}
        />
      </Head>
      <AnimatePresence>
        {openProcessPopup && data && (
          <ProcessPopup
            token={session?.accessToken}
            data={data}
            noPermission={needPermission}
            close={() => {
              setOpenProcessPopup(false)
              setNeedPermission(false)
            }}
            onUpload={onUpload}
          ></ProcessPopup>
        )}
      </AnimatePresence>
      <CaptionPreview></CaptionPreview>
      <div className={pageStyles.page}>
        <div className={classes(pageStyles.contents)}>
          <ChannelCard channel={Channels[id]} stat={statData}></ChannelCard>
        </div>
        <div className={classes(pageStyles.contents, pageStyles.overflowX)}>
          <div className={styles.tabHeader}>
            <TabGroup
              key={i18n.language}
              activeIndex={tabIndex}
              setActiveIndex={setTabIndex}
            >
              <TabButton key='waiting'>{t('tabs.waiting')}</TabButton>
              <TabButton key='done'>{t('tabs.done')}</TabButton>
              <TabButton key='ongoing'>{t('tabs.ongoing')}</TabButton>
            </TabGroup>
            <div className={styles.actions}>
              {// TODO: ?????? ???????????? ????????? false ??????
              tabIndex === 0 &&
                (!publicRuntimeConfig.hideApplyButton ||
                  session?.userState === 'admin') && (
                  <Button
                    size='large'
                    icon='upload-line'
                    onClick={() =>
                      data && data.length
                        ? isUploadable(
                            session,
                            () => {
                              if (!getVideoWorks(data).length) {
                                toast.error('?????? ????????? ??????????????????.')

                                return
                              }

                              setOpenProcessPopup(true)
                            },
                            () => {
                              if (!getVideoWorks(data).length) {
                                toast.error('?????? ????????? ??????????????????.')

                                return
                              }

                              window.location.hash = 'apply'
                              setOpenProcessPopup(true)
                              setNeedPermission(true)
                            }
                          )
                        : toast('????????? ?????? ?????? ????????? ?????????.')
                    }
                  >
                    {t('apply_all')}
                  </Button>
                )}
            </div>
          </div>
        </div>
        <div className={classes(pageStyles.contents, styles.lists)}>
          {error instanceof Error ? (
            <ErrorComponent error={error} retry={mutate}></ErrorComponent>
          ) : !data ? (
            <div className={styles.spinner}>
              <LoadSpinner></LoadSpinner>
            </div>
          ) : data.length ? (
            data.map(video => (
              <VideoProjectCard
                key={video.id}
                video={video}
                onUploadAuth={() => {
                  setOpenProcessPopup(true)
                  setNeedPermission(true)
                }}
                onUpload={onUpload}
              ></VideoProjectCard>
            ))
          ) : (
            <div className={styles.empty}>
              <div className={styles.contents}>
                <RandomImages id={id}></RandomImages>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer></Footer>
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
