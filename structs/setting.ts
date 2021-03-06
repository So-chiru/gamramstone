import { ReactNode } from 'react'
import { atom, DefaultValue, RecoilState, selector } from 'recoil'

interface GamramSettings {
  darkMode: boolean
}

export type SettingID = 'darkMode'

export interface SettingTypes {
  darkMode: boolean
}

export const Settings: Record<
  SettingID,
  SettingBase<SettingTypes[SettingID]>
> = {
  darkMode: {
    id: 'darkMode',
    type: 'checkbox',
    title: 'settings.darkmode',
    description: 'settings.darkmode_description',
    default:
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false,
  },
}

const initialSavedDarkMode =
  typeof window === 'undefined'
    ? null
    : localStorage.getItem('gamram.settings.darkMode')

export const darkModeAtom = atom({
  key: 'darkMode',
  default:
    typeof window === 'undefined'
      ? false
      : initialSavedDarkMode === null
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : initialSavedDarkMode === '1',
})

export const SettingsAtom: Record<
  SettingID,
  RecoilState<SettingTypes[SettingID]>
> = {
  darkMode: darkModeAtom,
}

export const globalSettings = selector<GamramSettings>({
  key: 'globalSettings',
  get: ({ get }) => {
    const darkMode = get(darkModeAtom)

    return { darkMode }
  },
  set: ({ set }, value) => {
    if (value instanceof DefaultValue) {
      return
    }

    ;(Object.keys(value) as SettingID[]).forEach(key => {
      if ('darkMode' in SettingsAtom) {
        localStorage.setItem(`gamram.settings.darkMode`, value[key] ? '1' : '0')
      }

      set(SettingsAtom[key], value[key])
    })
  },
})

export const validateSettings = (value: unknown): value is SettingTypes => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  if (
    'darkMode' in value &&
    typeof (value as Record<'darkMode', unknown>).darkMode === 'boolean'
  ) {
    return true
  }

  return false
}

export interface SettingBase<T> {
  id: SettingID
  title: string
  description: ReactNode
  type: 'checkbox' | 'button'
  disabled?: boolean
  default: T
  elementParams?: Record<string, unknown>
}

export interface Setting<T> extends SettingBase<T> {
  value: T
}

export type SettingDB = string | number
