import { InputField } from '@dhis2/ui'
import PropTypes from 'prop-types'

const TextInput = ({ id, label, value, validationText, onChange }) => (
    <InputField
        label={label}
        type="text"
        value={value !== undefined ? String(value) : ''}
        onChange={({ value }) =>
            onChange(id, value)
        }
        warning={!!validationText}
        validationText={validationText}
    />
)
TextInput.propTypes = {
    id: PropTypes.string,
    label: PropTypes.node,
    validationText: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
}

export default TextInput
