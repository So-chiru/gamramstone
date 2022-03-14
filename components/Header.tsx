import Link from 'next/link'
import styles from '../styles/components/Header.module.scss'
import { Button } from './Button'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import FadeInImage from './FadeInImage'
import { LoadSpinner } from './Loading'

export const Header = () => {
  const router = useRouter()
  const { data: session, status } = useSession()

  return (
    <header className={styles.header}>
      <div className={styles.contents}>
        <div className={styles.logo}>
          <Link href={'/'}>GAMRAMSTONE</Link>
        </div>
        <div className={styles.actions}>
          {status === 'loading' ? (
            <div className={styles.loading}>
              <LoadSpinner></LoadSpinner>
            </div>
          ) : session ? (
            <div
              className={styles.user}
              onClick={() => router.push('/account')}
            >
              <div className={styles.image}>
                {session!.user?.image && (
                  <FadeInImage
                    src={session!.user!.image!}
                    width={48}
                    unoptimized
                    height={48}
                    alt='프로필 이미지'
                  />
                )}
              </div>
            </div>
          ) : (
            <Button
              size='medium'
              onClick={() =>
                confirm(
                  'Google 계정으로 로그인합니다. 로그인 시 이메일이 노출될 수 있으니 잠시 방송 화면을 가려주세요.'
                ) &&
                signIn(
                  'google',
                  undefined,
                  window.location.href.indexOf('?wak') > -1
                    ? {
                        prompt: 'select_account',
                      }
                    : undefined
                )
              }
            >
              로그인
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
