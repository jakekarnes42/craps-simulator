import { TablePrecision } from '../../../engine/Money';
import SegmentedControl from '../../../shared/forms/SegmentedControl';

export type TablePrecisionControlProps = {
    id: string;
    label: string;
    disabled?: boolean;
    precision: TablePrecision;
    onChange: (precision: TablePrecision) => void;
};

const TablePrecisionControl = ({ id, label, disabled, precision, onChange }: TablePrecisionControlProps): JSX.Element => {
    const options = Object.values(TablePrecision).map((value) => ({ value, label: value }));

    return (
        <div className="compact-control">
            <div className="mb-0">
                <div className="form-label">{label}</div>
            </div>
            <div className="mb-0" id={`${id}-buttongroup`}>
                <SegmentedControl
                    ariaLabel={label}
                    options={options}
                    value={precision}
                    onChange={onChange}
                    disabled={disabled}
                />
            </div>
            <div className="mb-0">
                <small className="form-text text-muted">
                    {disabled
                        ? 'Exact-paying units prevent fractional odds and number-bet payouts.'
                        : 'Calculated wagers and payouts are paid down to this precision.'}
                </small>
            </div>
        </div>
    );
};

export default TablePrecisionControl;
