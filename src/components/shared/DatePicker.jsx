import cx from 'classnames'
import PropTypes from 'prop-types'
import React, { useRef, useLayoutEffect } from 'react'
import styles from './styles/DatePicker.module.css'

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0]

const DatePicker = ({
                        label,
                        name,
                        defaultVal,
                        onBlur,
                        onChange,
                        className,
                        maxDate,
                    }) => {
    const inputEl = useRef(null)

    useLayoutEffect(() => {
        if (inputEl.current && defaultVal) {
            inputEl.current.defaultValue = defaultVal.slice(0, 10)
        }
    }, [defaultVal])

    return (
        <div className={cx(styles.datePicker, className)}>
            <label className={styles.label}>{label}</label>
            <div className={styles.content}>
                <div className={styles.box}>
                    <div className={styles.inputDiv}>
                        <input
                            className={styles.input}
                            ref={inputEl}
                            type="date"
                            name={name}
                            max={maxDate}  // ✅ restrict to today or earlier
                            onBlur={
                                onBlur
                                    ? (e) => onBlur(e.target.value)
                                    : undefined
                            }
                            onChange={
                                onChange
                                    ? (e) => onChange(e.target.value)
                                    : undefined
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

DatePicker.propTypes = {
    label: PropTypes.string.isRequired,
    className: PropTypes.string,
    defaultVal: PropTypes.string,
    maxDate: PropTypes.string,
    name: PropTypes.string,
    onBlur: PropTypes.func,
    onChange: PropTypes.func,
}

export default DatePicker
