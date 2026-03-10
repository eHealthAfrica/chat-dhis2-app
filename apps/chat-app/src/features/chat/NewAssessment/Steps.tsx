import i18n from '@dhis2/d2-i18n'
import styles from './NewAssessment.module.css'

type SState = 'done' | 'active' | 'pending'

interface StepsProps {
    current: 1 | 2 | 3
}

export const Steps = ({ current }: StepsProps) => {
    const st = (n: number): SState => (n < current ? 'done' : n === current ? 'active' : 'pending')
    const cls = (n: number) => [styles.stepItem, styles[st(n)]].join(' ')

    return (
        <div className={styles.steps} aria-label={i18n.t('Import steps')}>
            <div className={cls(1)}>
                <div className={styles.stepBubble}>{st(1) === 'done' ? '✓' : '1'}</div>
                {i18n.t('Load file')}
            </div>
            <div className={[styles.stepConnector, current > 1 ? styles.done : ''].join(' ')} />
            <div className={cls(2)}>
                <div className={styles.stepBubble}>{st(2) === 'done' ? '✓' : '2'}</div>
                {i18n.t('Review')}
            </div>
            <div className={[styles.stepConnector, current > 2 ? styles.done : ''].join(' ')} />
            <div className={cls(3)}>
                <div className={styles.stepBubble}>3</div>
                {i18n.t('Import')}
            </div>
        </div>
    )
}
