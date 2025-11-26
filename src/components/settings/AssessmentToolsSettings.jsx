import { useNavigate } from 'react-router-dom'
import useAppSettings from '../../hooks/useAppSettings.js'
import TextInput from "./TextInput";

const AssessmentToolsSettings = () => {
    const { settings, changeSetting } = useAppSettings()
    const navigate = useNavigate()

    if (!settings) {
        return null
    }

    const {
        ccvHFATFlood='A294977888e',
        ccvHFATHeatwave ='pFSueR4Uwyy',
        ccvHFATDrought = 'VQye4gFGUpM',
        ccvHFATDashboard,

    } = settings

    return (
        <>
            <h2>Assessment Tools Configuration</h2>

            <TextInput
                id="ccvHFATFlood"
                label='Flood Assessment'
                value={ccvHFATFlood}
                onChange={changeSetting}
                inputWidth="100px"
            />

            <TextInput
                id="ccvHFATHeatwave"
                label='Heatwave Assessment'
                value={ccvHFATHeatwave}
                onChange={changeSetting}
                inputWidth="100px"
            />

            <TextInput
                id="ccvHFATDrought"
                label='Adaptation Drought Assessment'
                value={ccvHFATDrought}
                onChange={changeSetting}
                inputWidth="100px"
            />

            <TextInput
                id="ccvHFATDashboard"
                label='CHAT Dashboard URL'
                value={ccvHFATDashboard}
                onChange={changeSetting}
                inputWidth="100px"
            />

        </>
    )
}

export default AssessmentToolsSettings
