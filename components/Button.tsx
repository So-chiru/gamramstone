import { CSSProperties, ReactNode } from 'react'

import styles from '../styles/components/Button.module.scss'
import { classes } from '../utils/string'

type ButtonTheme = 'primary' | 'secondary' | 'danger' | 'warning'
type ButtonSize = 'large' | 'medium' | 'small'

interface ButtonBaseProps {
  className?: string
  theme?: ButtonTheme
  size?: ButtonSize
  disabled?: boolean
  children?: ReactNode
  roundness?: number,
  onClick?: () => void
}

interface ButtonStyles extends CSSProperties {
  '--round'?: string
}

export const Button = ({
  children,
  className,
  disabled = false,
  roundness = 0,
  size = 'medium',
  theme = 'primary',
  onClick
}: ButtonBaseProps) => {
  return (
    <div
      className={classes(
        styles.button,
        className,
        disabled && styles.disabled,
        size && styles[size],
        theme && styles[theme]
      )}
      onClick={() => onClick && !disabled && onClick()}
      style={
        {
          '--round': `${roundness}px`,
        } as ButtonStyles
      }
    >
      {children}
    </div>
  )
}
