import { IconCross16 } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { AssessmentPreview } from './parseAssessmentJson'
import styles from './NewAssessment.module.css'

interface FileBannerProps {
    fileName: string
    preview: AssessmentPreview
    onRemove: () => void
}

export const FileBanner = ({ fileName, preview, onRemove }: FileBannerProps) => {
    const counts = {
        sections:     preview.sections.length,
        dataElements: preview.dataElements.length,
        optionSets:   preview.optionSets.length,
        indicators:   preview.programIndicators.length,
    }

    return (
        <div className={styles.banner}>
            <div className={styles.bannerFile}>
                <div className={styles.bannerFileIcon}>JSON</div>
                <div style={{ minWidth: 0 }}>
                    <span className={styles.bannerFileName}>{fileName}</span>
                    <span className={styles.bannerFileSub}>{i18n.t('Review the preview below, then import.')}</span>
                </div>
            </div>

            <div className={styles.bannerStats}>
                <div className={[styles.bStat, styles.sec].join(' ')} title={i18n.t('Sections')}>
                    <div className={styles.bStatNum}>{counts.sections}</div>
                    <div className={styles.bStatLabel}>{i18n.t('Sections')}</div>
                </div>
                <div className={[styles.bStat, styles.de].join(' ')} title={i18n.t('Data elements')}>
                    <div className={styles.bStatNum}>{counts.dataElements}</div>
                    <div className={styles.bStatLabel}>{i18n.t('Elements')}</div>
                </div>
                <div className={[styles.bStat, styles.os].join(' ')} title={i18n.t('Option sets')}>
                    <div className={styles.bStatNum}>{counts.optionSets}</div>
                    <div className={styles.bStatLabel}>{i18n.t('Option sets')}</div>
                </div>
                <div className={[styles.bStat, styles.ind].join(' ')} title={i18n.t('Indicators')}>
                    <div className={styles.bStatNum}>{counts.indicators}</div>
                    <div className={styles.bStatLabel}>{i18n.t('Indicators')}</div>
                </div>
            </div>

            <button className={styles.bannerRemove} onClick={onRemove}>
                <IconCross16 />
                {i18n.t('Remove')}
            </button>
        </div>
    )
}
