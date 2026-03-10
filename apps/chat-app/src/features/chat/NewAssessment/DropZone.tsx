import { useRef, useState } from 'react'
import i18n from '@dhis2/d2-i18n'
import styles from './NewAssessment.module.css'

interface DropZoneProps {
    onFile: (file: File) => void
}

export const DropZone = ({ onFile }: DropZoneProps) => {
    const fileRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleFile = (file: File | undefined) => {
        if (file) onFile(file)
    }

    return (
        <>
            <div
                className={[styles.dropZone, isDragging ? styles.dragging : ''].join(' ')}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
                role="button"
                tabIndex={0}
            >
                <div className={styles.dzGraphic}>
                    <div className={styles.dzIconBox}>📦</div>
                    <div className={styles.dzBadge}>+</div>
                </div>
                <p className={styles.dzTitle}>{i18n.t('Drop your metadata JSON here')}</p>
                <p className={styles.dzHint}>{i18n.t('Or click to browse. Only .json files are supported.')}</p>
                <button
                    type="button"
                    className={styles.dzBtn}
                    onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                >
                    {i18n.t('Browse file')}
                </button>
            </div>
            <input
                ref={fileRef}
                className={styles.fileInput}
                type="file"
                accept=".json,application/json"
                onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
            />
        </>
    )
}
