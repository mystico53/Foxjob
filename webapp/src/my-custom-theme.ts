import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

export const myCustomTheme: CustomThemeConfig = {
	name: 'my-custom-theme',
	properties: {
		// =~= Theme Properties =~=
		'--theme-font-family-base': `system-ui`,
		'--theme-font-family-heading': `system-ui`,
		'--theme-font-color-base': '0 0 0',
		'--theme-font-color-dark': '255 255 255',
		'--theme-rounded-base': '9999px',
		'--theme-rounded-container': '8px',
		'--theme-border-base': '1px',
		// =~= Theme On-X Colors =~=
		'--on-primary': '0 0 0',
		'--on-secondary': '255 255 255',
		'--on-tertiary': '0 0 0',
		'--on-success': '0 0 0',
		'--on-warning': '0 0 0',
		'--on-error': '255 255 255',
		'--on-surface': '0 0 0',
		// =~= Theme Colors  =~=
		// primary | #FF9C00
		'--color-primary-50': '255 240 217', // #fff0d9
		'--color-primary-100': '255 235 204', // #ffebcc
		'--color-primary-200': '255 230 191', // #ffe6bf
		'--color-primary-300': '255 215 153', // #ffd799
		'--color-primary-400': '255 186 77', // #ffba4d
		'--color-primary-500': '255 156 0', // #FF9C00
		'--color-primary-600': '230 140 0', // #e68c00
		'--color-primary-700': '191 117 0', // #bf7500
		'--color-primary-800': '153 94 0', // #995e00
		'--color-primary-900': '125 76 0', // #7d4c00
		// secondary | #923E02
		'--color-secondary-50': '239 226 217', // #efe2d9
		'--color-secondary-100': '233 216 204', // #e9d8cc
		'--color-secondary-200': '228 207 192', // #e4cfc0
		'--color-secondary-300': '211 178 154', // #d3b29a
		'--color-secondary-400': '179 120 78', // #b3784e
		'--color-secondary-500': '146 62 2', // #923E02
		'--color-secondary-600': '131 56 2', // #833802
		'--color-secondary-700': '110 47 2', // #6e2f02
		'--color-secondary-800': '88 37 1', // #582501
		'--color-secondary-900': '72 30 1', // #481e01
		// tertiary | #F2F4F5
		'--color-tertiary-50': '253 253 254', // #fdfdfe
		'--color-tertiary-100': '252 253 253', // #fcfdfd
		'--color-tertiary-200': '252 252 253', // #fcfcfd
		'--color-tertiary-300': '250 251 251', // #fafbfb
		'--color-tertiary-400': '246 247 248', // #f6f7f8
		'--color-tertiary-500': '242 244 245', // #F2F4F5
		'--color-tertiary-600': '218 220 221', // #dadcdd
		'--color-tertiary-700': '182 183 184', // #b6b7b8
		'--color-tertiary-800': '145 146 147', // #919293
		'--color-tertiary-900': '119 120 120', // #777878
		// success | #84cc16
		'--color-success-50': '237 247 220', // #edf7dc
		'--color-success-100': '230 245 208', // #e6f5d0
		'--color-success-200': '224 242 197', // #e0f2c5
		'--color-success-300': '206 235 162', // #ceeba2
		'--color-success-400': '169 219 92', // #a9db5c
		'--color-success-500': '132 204 22', // #84cc16
		'--color-success-600': '119 184 20', // #77b814
		'--color-success-700': '99 153 17', // #639911
		'--color-success-800': '79 122 13', // #4f7a0d
		'--color-success-900': '65 100 11', // #41640b
		// warning | #EAB308
		'--color-warning-50': '252 244 218', // #fcf4da
		'--color-warning-100': '251 240 206', // #fbf0ce
		'--color-warning-200': '250 236 193', // #faecc1
		'--color-warning-300': '247 225 156', // #f7e19c
		'--color-warning-400': '240 202 82', // #f0ca52
		'--color-warning-500': '234 179 8', // #EAB308
		'--color-warning-600': '211 161 7', // #d3a107
		'--color-warning-700': '176 134 6', // #b08606
		'--color-warning-800': '140 107 5', // #8c6b05
		'--color-warning-900': '115 88 4', // #735804
		// error | #d21919
		'--color-error-50': '248 221 221', // #f8dddd
		'--color-error-100': '246 209 209', // #f6d1d1
		'--color-error-200': '244 198 198', // #f4c6c6
		'--color-error-300': '237 163 163', // #eda3a3
		'--color-error-400': '224 94 94', // #e05e5e
		'--color-error-500': '210 25 25', // #d21919
		'--color-error-600': '189 23 23', // #bd1717
		'--color-error-700': '158 19 19', // #9e1313
		'--color-error-800': '126 15 15', // #7e0f0f
		'--color-error-900': '103 12 12', // #670c0c
		// surface | #ffffff
		'--color-surface-50': '255 255 255', // #ffffff
		'--color-surface-100': '255 255 255', // #ffffff
		'--color-surface-200': '255 255 255', // #ffffff
		'--color-surface-300': '255 255 255', // #ffffff
		'--color-surface-400': '255 255 255', // #ffffff
		'--color-surface-500': '255 255 255', // #ffffff
		'--color-surface-600': '230 230 230', // #e6e6e6
		'--color-surface-700': '191 191 191', // #bfbfbf
		'--color-surface-800': '153 153 153', // #999999
		'--color-surface-900': '125 125 125' // #7d7d7d
	}
};
