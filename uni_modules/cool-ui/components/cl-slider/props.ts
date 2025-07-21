import type { PassThroughProps } from "../../types";

export type ClSliderPassThrough = {
	className?: string;
	track?: PassThroughProps;
	progress?: PassThroughProps;
	thumb?: PassThroughProps;
	value?: PassThroughProps;
};

export type ClSliderProps = {
	className?: string;
	pt?: ClSliderPassThrough;
	modelValue?: number;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	blockSize?: number;
	showValue?: boolean;
};
