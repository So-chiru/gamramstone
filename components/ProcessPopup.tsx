import { AnimatePresence, motion, Variants } from 'framer-motion'
import { signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState, useRef, ReactNode, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  extractFinishedVideosByLanguage,
  LanguageCode,
  LanguageNames,
  VideoWithCaption,
  VideoWorks,
} from '../structs/common'
import styles from '../styles/components/ProcessPopup.module.scss'
import { applyCaptions, updateVideoState } from '../utils/client/requests'
import { useBodyLock } from '../hooks/styles'
import { classes, getYouTubeId } from '../utils/string'
import { Button } from './Button'
import { LoadSpinner } from './Loading'
import { YouTubeThumbnail } from './VideoCard'

import confetties from '../utils/client/confetties'
import { useTranslation } from 'react-i18next'

const backgroundVariants: Variants = {
  initial: {
    opacity: 0,
    pointerEvents: 'none',
  },
  visible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
}

const popupVariants: Variants = {
  initial: {
    opacity: 0,
    translateY: 25,
  },
  visible: {
    opacity: 1,
    translateY: 0,
  },
}

const tabVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    translateX: direction > 0 ? 600 : -600,
  }),
  exit: (direction: number) => ({
    opacity: 0,
    translateX: direction < 0 ? 600 : -600,
  }),
  animate: {
    opacity: 1,
    translateX: 0,
  },
}

const tabTransition = {
  translateX: { type: 'spring', stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
}

export const PopupTab = ({
  className,
  children,
  custom,
}: {
  className: string
  children?: ReactNode
  custom: number
}) => {
  return (
    <motion.div
      className={className}
      variants={tabVariants}
      custom={custom}
      initial='initial'
      animate='animate'
      exit='exit'
      transition={tabTransition}
    >
      {children}
    </motion.div>
  )
}

const usePreviousValue = (num: number) => {
  const [previousValue, setPreviousValue] = useState<number[]>([0, 0])

  useEffect(() => {
    setPreviousValue(v => {
      return [v[1], num]
    })
  }, [num])

  return previousValue[0]
}

export const getVideoWorks = (datas: VideoWithCaption[]): VideoWorks[] => {
  return datas
    .map((videoData, dataIndex) => {
      return videoData.captions
        .map(v => {
          if (v.status !== 'waiting') {
            return null
          }

          return {
            id: videoData.id,
            originTitle: videoData.title,
            originDescription: videoData.description,
            dataIndex: dataIndex,
            lang: v.language,
            title: v.title,
            description: v.description,
            captions: v.captions,
          }
        })
        .filter(v => v !== null) as VideoWorks[]
    })
    .flat()
}

interface ProcessPopupProps {
  data: VideoWithCaption[]
  token?: string
  close?: () => void
  noPermission?: boolean
  onUpload?: (videos: [string, LanguageCode][]) => void
}

export const ProcessPopup = ({
  data,
  close,
  token,
  noPermission,
  onUpload,
}: ProcessPopupProps) => {
  const [closing, setClosing] = useState(false)
  const { t } = useTranslation()

  useBodyLock(!closing && true)

  const [step, setStep] = useState(0)
  const previousStep = usePreviousValue(step)

  const [tasks, setTasks] = useState<VideoWorks[]>(getVideoWorks(data))
  const [taskIndex, setTaskIndex] = useState<number>(0)

  const [errorTasks, setErrorTasks] = useState<VideoWorks[]>([])
  const [currentTaskDone, setCurrentTaskDone] = useState<boolean>(false)

  const [pause, setPause] = useState<boolean>(false)

  const errorStreaks = useRef(0)

  const localCloseHandler = useCallback(() => {
    if (!close) {
      return
    }

    setClosing(true)
    close()
  }, [close])

  /**
   * ????????? ???????????? ??? ????????? Effect. ?????? ?????? ????????? ????????? ???????????????.
   */
  useEffect(() => {
    if (!currentTaskDone) {
      return
    }

    setCurrentTaskDone(false)

    const loading = toast.loading('????????? ????????? ???????????? ???...')

    // ????????? ??? ????????? ????????? ????????? ????????? ???????????????.
    const videos = extractFinishedVideosByLanguage(tasks, errorTasks)
    const works = Array.from(videos, ([name, value]) => ({ name, value }))

    // works??? ?????? ???????????? ???????????? ????????? queue?????? ????????? ???????????????.
    // Promise.all??? ?????? ?????? ????????? ?????? DB ?????? ???????????? race condition??? ????????? ??? ?????????
    // ????????? blocking ???????????? ???????????? ??????????????????.
    let queue = works.map(({ name, value }) => () =>
        updateVideoState(
          name,
          value.map(v => v.id),
          window.location.href.indexOf('devMode') > -1
        )
      )

      /**
       * ????????? ?????? ???????????? ???????????? ???????????????.
       */
    ;(async () => {
      let results: boolean[] = []

      for (let i = 0; i < queue.length; i++) {
        const result = await (await queue[i]()).json()
        results.push(result.status === 'success')
      }

      const succeed = results.every(v => v === true)

      if (!succeed) {
        toast.error(`????????? ?????? ?????? ??? ????????? ??????????????????.`)
      } else {
        onUpload &&
          onUpload(
            works
              .map(({ value }) =>
                value.map(v => [v.id, v.lang] as [string, LanguageCode])
              )
              .flat()
          )
      }

      toast.dismiss(loading)

      if (!errorTasks.length) {
        setStep(2)
      } else {
        setStep(3)
      }

      setTaskIndex(0)
    })()
  }, [currentTaskDone, errorTasks, errorTasks.length, onUpload, tasks])

  useEffect(() => {
    if (step !== 2) {
      return
    }

    confetties.fireworks()
  }, [step])

  /**
   * ????????? ??? Effect. ?????? ???????????? ????????? ???????????????.
   */
  useEffect(() => {
    if (step !== 1) {
      return
    }

    if (pause) {
      return
    }

    /**
     * URL??? ?devMode??? ?????? ???????????? YouTube API??? ???????????? ?????? ???????????? ????????? ???????????????.
     */
    if (window.location.href.indexOf('devMode') > -1) {
      const timeout = setTimeout(() => {
        if (taskIndex + 1 >= tasks.length) {
          setCurrentTaskDone(true)

          return
        }

        if (Math.random() > 0.9) {
          setErrorTasks(v => [...v, tasks[taskIndex]])
        }

        setTaskIndex(taskIndex + 1)
      }, 600 * Math.random())

      return () => {
        clearTimeout(timeout)
      }
    }

    // YouTube??? ????????? ???????????? ?????? ???????????????. ?????? ???????????? ???????????? ????????????.
    applyCaptions(
      token,
      tasks[taskIndex].lang,
      tasks[taskIndex].id,
      tasks[taskIndex].title,
      tasks[taskIndex].description,
      tasks[taskIndex].captions
    )
      .then(() => {
        errorStreaks.current = 0

        setTimeout(() => {
          if (taskIndex + 1 >= tasks.length) {
            setCurrentTaskDone(true)

            return
          }

          setTaskIndex(taskIndex + 1)
        }, 300)
      })
      .catch(e => {
        toast.error((e as Error).message)
        errorStreaks.current++

        setErrorTasks(v => [...v, tasks[taskIndex]])

        if (errorStreaks.current >= 3) {
          setPause(true)
        }

        if (taskIndex + 1 >= tasks.length) {
          setCurrentTaskDone(true)

          return
        }

        setTaskIndex(taskIndex + 1)
      })
  }, [tasks, step, taskIndex, token, pause])

  const retryErrors = useCallback(() => {
    setCurrentTaskDone(false)
    setTaskIndex(0)
    setTasks(errorTasks)
    setErrorTasks([])
    setStep(1)
    setPause(false)
  }, [errorTasks])

  const Ask = (
    <PopupTab className={styles.tab} key='tab-ask' custom={step - previousStep}>
      <div
        className={styles.thumbnails}
        data-size={data && Math.min(5, data.length)}
      >
        {data?.map(
          (v, i) =>
            i < 5 && (
              <div key={`${v.url}-thumbnail`} className={styles.thumbnail}>
                <YouTubeThumbnail id={v.id}></YouTubeThumbnail>
              </div>
            )
        )}
      </div>
      <h1 className={styles.title}>
        {data && data.length}?????? ????????? ???????????? ????????? ??????????
      </h1>
      <div className={styles.actions}>
        <Button theme='secondary' icon='close' onClick={localCloseHandler}>
          {t('close')}
        </Button>
        <Button theme='primary' onClick={() => setStep(1)}>
          {t('run_like_dog')}
        </Button>
      </div>
    </PopupTab>
  )

  const OnProgress = (
    <PopupTab
      className={classes(styles.tab, styles.onProgress)}
      key='tab-progress'
      custom={step - previousStep}
    >
      <div className={styles.progressBar}>
        <span
          className={styles.bar}
          style={{
            width: `${(taskIndex / tasks.length) * 100}%`,
          }}
        ></span>
      </div>
      <div className={styles.workingThumbnail}>
        <YouTubeThumbnail id={tasks[taskIndex].id}></YouTubeThumbnail>
      </div>

      {pause ? (
        <>
          <h1 className={styles.title}>
            ????????? ?????? ???????????? ?????????. ?????? ????????????????
          </h1>
          <div className={styles.actions}>
            <Button theme='secondary' onClick={localCloseHandler}>
              {t('cancel')}
            </Button>
            <Button
              theme='primary'
              onClick={() => {
                errorStreaks.current = 0
                setPause(false)
              }}
            >
              {t('continue')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className={styles.title}>
            {tasks[taskIndex].title}
            <br />
            {LanguageNames[tasks[taskIndex].lang]} ?????? ????????? ???...
          </h1>
          <p className={styles.progressText}>
            {taskIndex + 1}/{tasks.length}
            {errorTasks.length ? ` (${errorTasks.length} ??????)` : ''}, ?????????
            ????????? ?????? ?????? ?????????.
          </p>
          <div className={styles.spinner}>
            <LoadSpinner></LoadSpinner>
          </div>
        </>
      )}
    </PopupTab>
  )

  const Success = (
    <PopupTab
      className={classes(styles.tab, styles.statusTab)}
      key='tab-success'
      custom={step - previousStep}
    >
      <div
        className={styles.thumbnails}
        data-size={data && Math.min(5, data.length)}
      >
        {data?.map(
          (v, i) =>
            i < 5 && (
              <div key={`${v.url}-thumbnail`} className={styles.thumbnail}>
                <YouTubeThumbnail id={getYouTubeId(v.url)}></YouTubeThumbnail>
              </div>
            )
        )}
      </div>
      <h1 className={styles.title}>
        {data.length}?????? ????????? ????????? ????????????!
      </h1>
      <p className={styles.description}>
        ?????? ?????? ??????????????? ?????????????????? ???????????????.
      </p>

      <div className={styles.actions}>
        <Button theme='secondary' icon='close-line' onClick={localCloseHandler}>
          {t('close')}
        </Button>
        <Button
          theme='primary'
          icon='logout-box-line'
          onClick={() => signOut()}
        >
          {t('sign_out')}
        </Button>
      </div>
    </PopupTab>
  )

  const Error = (
    <PopupTab
      className={classes(styles.tab, styles.statusTab)}
      key='tab-error'
      custom={step - previousStep}
    >
      <div
        className={styles.thumbnails}
        data-size={Math.min(5, errorTasks.length)}
      >
        {errorTasks.map(
          (v, i) =>
            i < 5 && (
              <div key={`${v.id}-thumbnail`} className={styles.thumbnail}>
                <YouTubeThumbnail id={v.id}></YouTubeThumbnail>
              </div>
            )
        )}
      </div>
      <h1 className={styles.title}>
        {errorTasks.length}?????? ????????? ????????? ????????????...
      </h1>

      <div className={styles.actions}>
        <Button theme='secondary' icon='close-line' onClick={localCloseHandler}>
          {t('close')}
        </Button>
        <Button
          theme='primary'
          icon='restart-line'
          onClick={() => retryErrors()}
        >
          {t('retry')}
        </Button>
      </div>
    </PopupTab>
  )

  const RequestPermission = (
    <PopupTab
      className={classes(styles.tab, styles.statusTab)}
      key='tab-permission'
      custom={step - previousStep}
    >
      <div className={styles.center}>
        <h1 className={styles.title}>{t('popup.link_title')}</h1>

        <p className={styles.description}>
          ???????????? ??????, ?????????????????? ?????? ????????? ???????????? ???????????????{' '}
          <Link href={'/privacy'} passHref>
            <a target='_blank'>???????????? ????????????</a>
          </Link>
          ?????? ???????????????.<br></br>????????? ??????????????? ??? ????????????.
        </p>
      </div>

      <div className={styles.actions}>
        <Button theme='secondary' icon='close-line' onClick={localCloseHandler}>
          {t('close')}
        </Button>
        <Button
          theme='primary'
          icon='login-box-line'
          onClick={() =>
            signIn(
              'google',
              undefined,
              window.location.href.indexOf('?wak') > -1
                ? {
                    scope:
                      'openid profile https://www.googleapis.com/auth/youtube.force-ssl',
                    prompt: 'select_account',
                  }
                : {
                    scope:
                      'openid profile https://www.googleapis.com/auth/youtube.force-ssl',
                  }
            )
          }
        >
          {t('popup.link')}
        </Button>
      </div>
      <div className={styles.warn}>{t('popup.bottom_warning')}</div>
    </PopupTab>
  )

  return (
    <div className={styles.popupWrapper} data-closing={closing}>
      <motion.div
        className={styles.background}
        initial='initial'
        animate='visible'
        exit='initial'
        variants={backgroundVariants}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 10,
        }}
        onClick={ev => {
          ev.stopPropagation()
          step !== 1 && localCloseHandler()
        }}
      ></motion.div>
      <motion.div
        className={styles.popup}
        initial='initial'
        animate='visible'
        exit='initial'
        variants={popupVariants}
        transition={{
          type: 'spring',
          duration: 0.45,
        }}
      >
        <AnimatePresence custom={step - previousStep}>
          {noPermission
            ? RequestPermission
            : step === 0
            ? Ask
            : step === 1
            ? OnProgress
            : step === 2
            ? Success
            : Error}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default ProcessPopup
