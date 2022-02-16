import styles from '../styles/components/Checkbox.module.scss'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export const Checkbox = ({ checked, onChange }: CheckboxProps) => {
  return (
    <div className={styles.checkbox}>
      <input
        type='checkbox'
        id='example'
        defaultChecked={checked}
        onChange={ev => onChange(ev.target.checked)}
      />
      <label htmlFor='example' className={styles.toggle}>
        <div className={styles.slider}></div>
      </label>
    </div>
  )
}

export default Checkbox
