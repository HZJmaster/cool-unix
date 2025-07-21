export type GenerateFrameResult = {
	frameBuffer: Uint8Array;
	width: number;
};

/**
 * 二维码生成器
 * @description 纯 UTS 实现的二维码生成算法，支持多平台，兼容 uni-app x。核心算法参考 QR Code 标准，支持自定义纠错级别、自动适配内容长度。
 * @version 1.0.0
 * @平台兼容性 App、H5、微信小程序、UTS
 * @注意事项
 * - 仅支持 8bit 字符串内容，不支持数字/字母/汉字等模式优化
 * - 生成结果为二维码点阵数据和宽度，需配合 canvas 绘制
 * - 纠错级别支持 'L'/'M'/'Q'/'H'，默认 'L'
 */

// 对齐块间距表 - 不同版本二维码的对齐块分布位置
const ALIGNMENT_DELTA = [
	0, 11, 15, 19, 23, 27, 31, 16, 18, 20, 22, 24, 26, 28, 20, 22, 24, 24, 26, 28, 28, 22, 24, 24,
	26, 26, 28, 28, 24, 24, 26, 26, 26, 28, 28, 24, 26, 26, 26, 28, 28
] as number[];

// 纠错块参数表 - 每个版本包含4个参数:块数、数据宽度、纠错宽度
const ECC_BLOCKS = [
	1, 0, 19, 7, 1, 0, 16, 10, 1, 0, 13, 13, 1, 0, 9, 17, 1, 0, 34, 10, 1, 0, 28, 16, 1, 0, 22, 22,
	1, 0, 16, 28, 1, 0, 55, 15, 1, 0, 44, 26, 2, 0, 17, 18, 2, 0, 13, 22, 1, 0, 80, 20, 2, 0, 32,
	18, 2, 0, 24, 26, 4, 0, 9, 16, 1, 0, 108, 26, 2, 0, 43, 24, 2, 2, 15, 18, 2, 2, 11, 22, 2, 0,
	68, 18, 4, 0, 27, 16, 4, 0, 19, 24, 4, 0, 15, 28, 2, 0, 78, 20, 4, 0, 31, 18, 2, 4, 14, 18, 4,
	1, 13, 26, 2, 0, 97, 24, 2, 2, 38, 22, 4, 2, 18, 22, 4, 2, 14, 26, 2, 0, 116, 30, 3, 2, 36, 22,
	4, 4, 16, 20, 4, 4, 12, 24, 2, 2, 68, 18, 4, 1, 43, 26, 6, 2, 19, 24, 6, 2, 15, 28, 4, 0, 81,
	20, 1, 4, 50, 30, 4, 4, 22, 28, 3, 8, 12, 24, 2, 2, 92, 24, 6, 2, 36, 22, 4, 6, 20, 26, 7, 4,
	14, 28, 4, 0, 107, 26, 8, 1, 37, 22, 8, 4, 20, 24, 12, 4, 11, 22, 3, 1, 115, 30, 4, 5, 40, 24,
	11, 5, 16, 20, 11, 5, 12, 24, 5, 1, 87, 22, 5, 5, 41, 24, 5, 7, 24, 30, 11, 7, 12, 24, 5, 1, 98,
	24, 7, 3, 45, 28, 15, 2, 19, 24, 3, 13, 15, 30, 1, 5, 107, 28, 10, 1, 46, 28, 1, 15, 22, 28, 2,
	17, 14, 28, 5, 1, 120, 30, 9, 4, 43, 26, 17, 1, 22, 28, 2, 19, 14, 28, 3, 4, 113, 28, 3, 11, 44,
	26, 17, 4, 21, 26, 9, 16, 13, 26, 3, 5, 107, 28, 3, 13, 41, 26, 15, 5, 24, 30, 15, 10, 15, 28,
	4, 4, 116, 28, 17, 0, 42, 26, 17, 6, 22, 28, 19, 6, 16, 30, 2, 7, 111, 28, 17, 0, 46, 28, 7, 16,
	24, 30, 34, 0, 13, 24, 4, 5, 121, 30, 4, 14, 47, 28, 11, 14, 24, 30, 16, 14, 15, 30, 6, 4, 117,
	30, 6, 14, 45, 28, 11, 16, 24, 30, 30, 2, 16, 30, 8, 4, 106, 26, 8, 13, 47, 28, 7, 22, 24, 30,
	22, 13, 15, 30, 10, 2, 114, 28, 19, 4, 46, 28, 28, 6, 22, 28, 33, 4, 16, 30, 8, 4, 122, 30, 22,
	3, 45, 28, 8, 26, 23, 30, 12, 28, 15, 30, 3, 10, 117, 30, 3, 23, 45, 28, 4, 31, 24, 30, 11, 31,
	15, 30, 7, 7, 116, 30, 21, 7, 45, 28, 1, 37, 23, 30, 19, 26, 15, 30, 5, 10, 115, 30, 19, 10, 47,
	28, 15, 25, 24, 30, 23, 25, 15, 30, 13, 3, 115, 30, 2, 29, 46, 28, 42, 1, 24, 30, 23, 28, 15,
	30, 17, 0, 115, 30, 10, 23, 46, 28, 10, 35, 24, 30, 19, 35, 15, 30, 17, 1, 115, 30, 14, 21, 46,
	28, 29, 19, 24, 30, 11, 46, 15, 30, 13, 6, 115, 30, 14, 23, 46, 28, 44, 7, 24, 30, 59, 1, 16,
	30, 12, 7, 121, 30, 12, 26, 47, 28, 39, 14, 24, 30, 22, 41, 15, 30, 6, 14, 121, 30, 6, 34, 47,
	28, 46, 10, 24, 30, 2, 64, 15, 30, 17, 4, 122, 30, 29, 14, 46, 28, 49, 10, 24, 30, 24, 46, 15,
	30, 4, 18, 122, 30, 13, 32, 46, 28, 48, 14, 24, 30, 42, 32, 15, 30, 20, 4, 117, 30, 40, 7, 47,
	28, 43, 22, 24, 30, 10, 67, 15, 30, 19, 6, 118, 30, 18, 31, 47, 28, 34, 34, 24, 30, 20, 61, 15,
	30
] as number[];

// 纠错级别映射表 - 将人类可读的纠错级别映射为内部数值
const ECC_LEVELS = new Map<string, number>([
	["L", 1],
	["M", 0],
	["Q", 3],
	["H", 2]
]);

// 最终格式信息掩码表 - 用于格式信息区域的掩码计算(level << 3 | mask)
const FINAL_FORMAT = [
	0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976 /* L */, 0x5412, 0x5125, 0x5e7c,
	0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0 /* M */, 0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183,
	0x2eda, 0x2bed /* Q */, 0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b /* H */
];

// Galois域指数表 - 用于纠错码计算的查找表
const GALOIS_EXPONENT = [
	0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1d, 0x3a, 0x74, 0xe8, 0xcd, 0x87, 0x13, 0x26,
	0x4c, 0x98, 0x2d, 0x5a, 0xb4, 0x75, 0xea, 0xc9, 0x8f, 0x03, 0x06, 0x0c, 0x18, 0x30, 0x60, 0xc0,
	0x9d, 0x27, 0x4e, 0x9c, 0x25, 0x4a, 0x94, 0x35, 0x6a, 0xd4, 0xb5, 0x77, 0xee, 0xc1, 0x9f, 0x23,
	0x46, 0x8c, 0x05, 0x0a, 0x14, 0x28, 0x50, 0xa0, 0x5d, 0xba, 0x69, 0xd2, 0xb9, 0x6f, 0xde, 0xa1,
	0x5f, 0xbe, 0x61, 0xc2, 0x99, 0x2f, 0x5e, 0xbc, 0x65, 0xca, 0x89, 0x0f, 0x1e, 0x3c, 0x78, 0xf0,
	0xfd, 0xe7, 0xd3, 0xbb, 0x6b, 0xd6, 0xb1, 0x7f, 0xfe, 0xe1, 0xdf, 0xa3, 0x5b, 0xb6, 0x71, 0xe2,
	0xd9, 0xaf, 0x43, 0x86, 0x11, 0x22, 0x44, 0x88, 0x0d, 0x1a, 0x34, 0x68, 0xd0, 0xbd, 0x67, 0xce,
	0x81, 0x1f, 0x3e, 0x7c, 0xf8, 0xed, 0xc7, 0x93, 0x3b, 0x76, 0xec, 0xc5, 0x97, 0x33, 0x66, 0xcc,
	0x85, 0x17, 0x2e, 0x5c, 0xb8, 0x6d, 0xda, 0xa9, 0x4f, 0x9e, 0x21, 0x42, 0x84, 0x15, 0x2a, 0x54,
	0xa8, 0x4d, 0x9a, 0x29, 0x52, 0xa4, 0x55, 0xaa, 0x49, 0x92, 0x39, 0x72, 0xe4, 0xd5, 0xb7, 0x73,
	0xe6, 0xd1, 0xbf, 0x63, 0xc6, 0x91, 0x3f, 0x7e, 0xfc, 0xe5, 0xd7, 0xb3, 0x7b, 0xf6, 0xf1, 0xff,
	0xe3, 0xdb, 0xab, 0x4b, 0x96, 0x31, 0x62, 0xc4, 0x95, 0x37, 0x6e, 0xdc, 0xa5, 0x57, 0xae, 0x41,
	0x82, 0x19, 0x32, 0x64, 0xc8, 0x8d, 0x07, 0x0e, 0x1c, 0x38, 0x70, 0xe0, 0xdd, 0xa7, 0x53, 0xa6,
	0x51, 0xa2, 0x59, 0xb2, 0x79, 0xf2, 0xf9, 0xef, 0xc3, 0x9b, 0x2b, 0x56, 0xac, 0x45, 0x8a, 0x09,
	0x12, 0x24, 0x48, 0x90, 0x3d, 0x7a, 0xf4, 0xf5, 0xf7, 0xf3, 0xfb, 0xeb, 0xcb, 0x8b, 0x0b, 0x16,
	0x2c, 0x58, 0xb0, 0x7d, 0xfa, 0xe9, 0xcf, 0x83, 0x1b, 0x36, 0x6c, 0xd8, 0xad, 0x47, 0x8e, 0x00
];

// Galois域对数表 - 用于纠错码计算的反向查找表
const GALOIS_LOG = [
	0xff, 0x00, 0x01, 0x19, 0x02, 0x32, 0x1a, 0xc6, 0x03, 0xdf, 0x33, 0xee, 0x1b, 0x68, 0xc7, 0x4b,
	0x04, 0x64, 0xe0, 0x0e, 0x34, 0x8d, 0xef, 0x81, 0x1c, 0xc1, 0x69, 0xf8, 0xc8, 0x08, 0x4c, 0x71,
	0x05, 0x8a, 0x65, 0x2f, 0xe1, 0x24, 0x0f, 0x21, 0x35, 0x93, 0x8e, 0xda, 0xf0, 0x12, 0x82, 0x45,
	0x1d, 0xb5, 0xc2, 0x7d, 0x6a, 0x27, 0xf9, 0xb9, 0xc9, 0x9a, 0x09, 0x78, 0x4d, 0xe4, 0x72, 0xa6,
	0x06, 0xbf, 0x8b, 0x62, 0x66, 0xdd, 0x30, 0xfd, 0xe2, 0x98, 0x25, 0xb3, 0x10, 0x91, 0x22, 0x88,
	0x36, 0xd0, 0x94, 0xce, 0x8f, 0x96, 0xdb, 0xbd, 0xf1, 0xd2, 0x13, 0x5c, 0x83, 0x38, 0x46, 0x40,
	0x1e, 0x42, 0xb6, 0xa3, 0xc3, 0x48, 0x7e, 0x6e, 0x6b, 0x3a, 0x28, 0x54, 0xfa, 0x85, 0xba, 0x3d,
	0xca, 0x5e, 0x9b, 0x9f, 0x0a, 0x15, 0x79, 0x2b, 0x4e, 0xd4, 0xe5, 0xac, 0x73, 0xf3, 0xa7, 0x57,
	0x07, 0x70, 0xc0, 0xf7, 0x8c, 0x80, 0x63, 0x0d, 0x67, 0x4a, 0xde, 0xed, 0x31, 0xc5, 0xfe, 0x18,
	0xe3, 0xa5, 0x99, 0x77, 0x26, 0xb8, 0xb4, 0x7c, 0x11, 0x44, 0x92, 0xd9, 0x23, 0x20, 0x89, 0x2e,
	0x37, 0x3f, 0xd1, 0x5b, 0x95, 0xbc, 0xcf, 0xcd, 0x90, 0x87, 0x97, 0xb2, 0xdc, 0xfc, 0xbe, 0x61,
	0xf2, 0x56, 0xd3, 0xab, 0x14, 0x2a, 0x5d, 0x9e, 0x84, 0x3c, 0x39, 0x53, 0x47, 0x6d, 0x41, 0xa2,
	0x1f, 0x2d, 0x43, 0xd8, 0xb7, 0x7b, 0xa4, 0x76, 0xc4, 0x17, 0x49, 0xec, 0x7f, 0x0c, 0x6f, 0xf6,
	0x6c, 0xa1, 0x3b, 0x52, 0x29, 0x9d, 0x55, 0xaa, 0xfb, 0x60, 0x86, 0xb1, 0xbb, 0xcc, 0x3e, 0x5a,
	0xcb, 0x59, 0x5f, 0xb0, 0x9c, 0xa9, 0xa0, 0x51, 0x0b, 0xf5, 0x16, 0xeb, 0x7a, 0x75, 0x2c, 0xd7,
	0x4f, 0xae, 0xd5, 0xe9, 0xe6, 0xe7, 0xad, 0xe8, 0x74, 0xd6, 0xf4, 0xea, 0xa8, 0x50, 0x58, 0xaf
];

// 二维码质量评估系数 - 用于计算最佳掩码模式
// N1: 连续5个及以上同色模块的惩罚分数
const N1 = 3;
// N2: 2x2同色模块区域的惩罚分数
const N2 = 3;
// N3: 类似定位图形的图案(1:1:3:1:1)的惩罚分数
const N3 = 40;
// N4: 黑白模块比例不均衡的惩罚分数
const N4 = 10;

// 版本信息掩码表 - 用于在二维码中嵌入版本信息
const VERSION_BLOCK = [
	0xc94, 0x5bc, 0xa99, 0x4d3, 0xbf6, 0x762, 0x847, 0x60d, 0x928, 0xb78, 0x45d, 0xa17, 0x532,
	0x9a6, 0x683, 0x8c9, 0x7ec, 0xec4, 0x1e1, 0xfab, 0x08e, 0xc1a, 0x33f, 0xd75, 0x250, 0x9d5,
	0x6f0, 0x8ba, 0x79f, 0xb0b, 0x42e, 0xa64, 0x541, 0xc69
];

/**
 * 生成二维码点阵
 * @param _str 输入字符串，支持任意文本内容，默认 null 表示空字符串
 * @param ecc 纠错级别，可选 'L' | 'M' | 'Q' | 'H'，默认 'L'
 * @returns {GenerateFrameResult} 返回二维码点阵数据和宽度
 */
export function generateFrame(
	_str: string | null = null,
	ecc: string | null = null
): GenerateFrameResult {
	// 变量声明区，所有临时变量、缓冲区
	let i: number;
	let t: number;
	let j: number;
	let k: number;
	let m: number;
	let v: number;
	let x: number;
	let y: number;
	let version: number;
	let str = _str == null ? "" : _str;
	let width = 0;
	// 获取纠错级别数值
	let eccLevel = ECC_LEVELS.get(ecc == null ? "L" : ecc)!;

	// Data block
	// 数据块、纠错块、块数
	let dataBlock: number;
	let eccBlock: number;
	let neccBlock1: number;
	let neccBlock2: number;

	// ECC buffer.
	// 纠错码缓冲区 - 先初始化为空数组，后面会重新赋值
	let eccBuffer: Uint8Array;

	// Image buffer.
	// 二维码点阵缓冲区 - 先初始化为空数组，后面会重新赋值
	let frameBuffer = new Uint8Array(0);

	// Fixed part of the image.
	// 点阵掩码缓冲区（标记不可变区域） - 先初始化为空数组，后面会重新赋值
	let frameMask = new Uint8Array(0);

	// Generator polynomial.
	// 生成多项式缓冲区（纠错码计算用） - 先初始化为空数组，后面会重新赋值
	let polynomial = new Uint8Array(0);

	// Data input buffer.
	// 数据输入缓冲区 - 先初始化为空数组，后面会重新赋值
	let stringBuffer = new Uint8Array(0);

	/**
	 * 设置掩码位，表示该点为不可变区域（对称处理）
	 * @param _x 横坐标
	 * @param _y 纵坐标
	 */
	function setMask(_x: number, _y: number) {
		let bit: number;
		let x = _x;
		let y = _y;

		if (x > y) {
			bit = x;
			x = y;
			y = bit;
		}

		bit = y;
		bit *= y;
		bit += y;
		bit >>= 1;
		bit += x;

		frameMask[bit] = 1;
	}

	/**
	 * 添加对齐块，设置对应点阵和掩码
	 * @param _x 横坐标
	 * @param _y 纵坐标
	 */
	function addAlignment(_x: number, _y: number) {
		let i: number;
		let x = _x;
		let y = _y;

		frameBuffer[x + width * y] = 1;

		for (i = -2; i < 2; i++) {
			frameBuffer[x + i + width * (y - 2)] = 1;
			frameBuffer[x - 2 + width * (y + i + 1)] = 1;
			frameBuffer[x + 2 + width * (y + i)] = 1;
			frameBuffer[x + i + 1 + width * (y + 2)] = 1;
		}

		for (i = 0; i < 2; i++) {
			setMask(x - 1, y + i);
			setMask(x + 1, y - i);
			setMask(x - i, y - 1);
			setMask(x + i, y + 1);
		}

		for (i = 2; i < 4; i++) {
			frameBuffer[x + i + width * (y - 2)] = 1;
			frameBuffer[x - 2 + width * (y + i - 1)] = 1;
			frameBuffer[x + 2 + width * (y + i - 2)] = 1;
			frameBuffer[x - 1 + width * (y + i - 2)] = 1;
		}
	}

	/**
	 * Galois 域取模运算
	 * @param _x 输入数值
	 * @returns {number} 取模结果
	 */
	function modN(_x: number): number {
		var x = _x;
		while (x >= 255) {
			x -= 255;
			x = (x >> 8) + (x & 255);
		}

		return x;
	}

	/**
	 * 计算并追加纠错码到数据块
	 * @param _data 数据起始索引
	 * @param _dataLength 数据长度
	 * @param _ecc 纠错码起始索引
	 * @param _eccLength 纠错码长度
	 */
	function appendData(_data: number, _dataLength: number, _ecc: number, _eccLength: number) {
		let bit: number;
		let i: number;
		let j: number;
		let data = _data;
		let dataLength = _dataLength;
		let ecc = _ecc;
		let eccLength = _eccLength;

		for (i = 0; i < eccLength; i++) {
			stringBuffer[ecc + i] = 0;
		}

		for (i = 0; i < dataLength; i++) {
			bit = GALOIS_LOG[stringBuffer[data + i] ^ stringBuffer[ecc]];

			if (bit != 255) {
				for (j = 1; j < eccLength; j++) {
					stringBuffer[ecc + j - 1] =
						stringBuffer[ecc + j] ^
						GALOIS_EXPONENT[modN(bit + polynomial[eccLength - j])];
				}
			} else {
				for (j = ecc; j < ecc + eccLength; j++) {
					stringBuffer[j] = stringBuffer[j + 1];
				}
			}

			stringBuffer[ecc + eccLength - 1] =
				bit == 255 ? 0 : GALOIS_EXPONENT[modN(bit + polynomial[0])];
		}
	}

	/**
	 * 判断某点是否为掩码区域
	 * @param _x 横坐标
	 * @param _y 纵坐标
	 * @returns {boolean} 是否为掩码
	 */
	function isMasked(_x: number, _y: number): boolean {
		let bit: number;
		let x = _x;
		let y = _y;

		if (x > y) {
			bit = x;
			x = y;
			y = bit;
		}

		bit = y;
		bit += y * y;
		bit >>= 1;
		bit += x;
		return frameMask[bit] == 1;
	}

	/**
	 * 根据 QR Code 标准，应用指定的掩码 pattern
	 * @param mask 掩码编号 (0-7)
	 */
	function applyMask(mask: number) {
		for (let y = 0; y < width; y++) {
			for (let x = 0; x < width; x++) {
				if (!isMasked(x, y)) {
					let shouldInvert = false;
					switch (mask) {
						case 0:
							shouldInvert = (x + y) % 2 == 0;
							break;
						case 1:
							shouldInvert = y % 2 == 0;
							break;
						case 2:
							shouldInvert = x % 3 == 0;
							break;
						case 3:
							shouldInvert = (x + y) % 3 == 0;
							break;
						case 4:
							shouldInvert = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 == 0;
							break;
						case 5:
							shouldInvert = ((x * y) % 2) + ((x * y) % 3) == 0;
							break;
						case 6:
							shouldInvert = (((x * y) % 2) + ((x * y) % 3)) % 2 == 0;
							break;
						case 7:
							shouldInvert = (((x + y) % 2) + ((x * y) % 3)) % 2 == 0;
							break;
					}

					if (shouldInvert) {
						frameBuffer[x + y * width] ^= 1;
					}
				}
			}
		}
	}

	/**
	 * 计算连续同色块的"坏度"分数
	 * @param runLengths
	 * @param length 块长度
	 * @returns {number} 坏度分数
	 */
	function getBadRuns(runLengths: number[], length: number): number {
		let badRuns = 0;
		let i: number;

		for (i = 0; i <= length; i++) {
			if (i < runLengths.length && runLengths[i] >= 5) {
				badRuns += N1 + runLengths[i] - 5;
			}
		}

		// FBFFFBF as in finder.
		for (i = 3; i < length - 1; i += 2) {
			// 检查数组索引是否越界
			if (i + 2 >= runLengths.length || i - 3 < 0) {
				continue;
			}

			if (
				runLengths[i - 2] == runLengths[i + 2] &&
				runLengths[i + 2] == runLengths[i - 1] &&
				runLengths[i - 1] == runLengths[i + 1] &&
				runLengths[i - 1] * 3 == runLengths[i] &&
				// Background around the foreground pattern? Not part of the specs.
				(runLengths[i - 3] == 0 ||
					i + 3 > length ||
					runLengths[i - 3] * 3 >= runLengths[i] * 4 ||
					runLengths[i + 3] * 3 >= runLengths[i] * 4)
			) {
				badRuns += N3;
			}
		}

		return badRuns;
	}

	/**
	 * 评估当前二维码点阵的整体"坏度"
	 * @returns {number} 坏度分数
	 */
	function checkBadness(): number {
		let b: number;
		let b1: number;
		let bad = 0;
		let big: number;
		let bw = 0;
		let count = 0;
		let h: number;
		let x: number;
		let y: number;
		// 优化：在函数内创建badBuffer，避免外部变量的内存泄漏风险
		let badBuffer = new Array<number>(width);

		// Blocks of same colour.
		for (y = 0; y < width - 1; y++) {
			for (x = 0; x < width - 1; x++) {
				// All foreground colour.
				if (
					(frameBuffer[x + width * y] == 1 &&
						frameBuffer[x + 1 + width * y] == 1 &&
						frameBuffer[x + width * (y + 1)] == 1 &&
						frameBuffer[x + 1 + width * (y + 1)] == 1) ||
					// All background colour.
					(frameBuffer[x + width * y] == 0 &&
						frameBuffer[x + 1 + width * y] == 0 &&
						frameBuffer[x + width * (y + 1)] == 0 &&
						frameBuffer[x + 1 + width * (y + 1)] == 0)
				) {
					bad += N2;
				}
			}
		}

		// X runs
		for (y = 0; y < width; y++) {
			h = 0;
			badBuffer[h] = 0;
			b = 0;
			for (x = 0; x < width; x++) {
				b1 = frameBuffer[x + width * y];
				if (b1 == b) {
					if (h < badBuffer.length) {
						badBuffer[h]++;
					}
				} else {
					h++;

					if (h < badBuffer.length) {
						badBuffer[h] = 1;
					}
				}

				b = b1;
				bw += b > 0 ? 1 : -1;
			}

			bad += getBadRuns(badBuffer, h);
		}

		if (bw < 0) bw = -bw;

		big = bw;
		big += big << 2;
		big <<= 1;

		while (big > width * width) {
			big -= width * width;
			count++;
		}

		bad += count * N4;

		// Y runs.
		for (x = 0; x < width; x++) {
			h = 0;
			badBuffer[h] = 0;
			b = 0;
			for (y = 0; y < width; y++) {
				b1 = frameBuffer[x + width * y];
				if (b1 == b) {
					if (h < badBuffer.length) {
						badBuffer[h]++;
					}
				} else {
					h++;
					if (h < badBuffer.length) {
						badBuffer[h] = 1;
					}
				}

				b = b1;
			}

			bad += getBadRuns(badBuffer, h);
		}

		return bad;
	}

	/**
	 * 将字符串转为 UTF-8 编码，兼容多平台
	 * @param str 输入字符串
	 * @returns {string} UTF-8 编码字符串
	 */
	function toUtf8(str: string): string {
		let out = "";
		let i: number;
		let len: number;
		let c: number;
		len = str.length;
		for (i = 0; i < len; i++) {
			c = str.charCodeAt(i)!;
			if (c >= 0x0001 && c <= 0x007f) {
				out += str.charAt(i);
			} else if (c > 0x07ff) {
				out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f));
				out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
				out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
			} else {
				out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f));
				out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
			}
		}
		return out;
	}
	//end functions

	// Find the smallest version that fits the string.
	// 1. 字符串转 UTF-8，计算长度
	str = toUtf8(str);
	t = str.length;

	// 2. 自动选择最小可用版本
	version = 0;
	do {
		version++;
		k = (eccLevel - 1) * 4 + (version - 1) * 16;
		neccBlock1 = ECC_BLOCKS[k++];
		neccBlock2 = ECC_BLOCKS[k++];
		dataBlock = ECC_BLOCKS[k++];
		eccBlock = ECC_BLOCKS[k];

		k = dataBlock * (neccBlock1 + neccBlock2) + neccBlock2 - 3 + (version <= 9 ? 1 : 0);

		if (t <= k) break;
	} while (version < 40);

	// FIXME: Ensure that it fits insted of being truncated.
	// 3. 计算二维码宽度
	width = 17 + 4 * version;

	// Allocate, clear and setup data structures.
	// 4. 分配缓冲区, 使用定长的 Uint8Array 优化内存
	v = dataBlock + (dataBlock + eccBlock) * (neccBlock1 + neccBlock2) + neccBlock2;
	eccBuffer = new Uint8Array(v);
	stringBuffer = new Uint8Array(v);

	// 5. 预分配点阵、掩码缓冲区
	frameBuffer = new Uint8Array(width * width);
	frameMask = new Uint8Array(Math.floor((width * (width + 1) + 1) / 2));

	// Insert finders: Foreground colour to frame and background to mask.
	// 插入定位点: 前景色为二维码，背景色为掩码
	for (t = 0; t < 3; t++) {
		k = 0;
		y = 0;
		if (t == 1) k = width - 7;
		if (t == 2) y = width - 7;

		frameBuffer[y + 3 + width * (k + 3)] = 1;

		for (x = 0; x < 6; x++) {
			frameBuffer[y + x + width * k] = 1;
			frameBuffer[y + width * (k + x + 1)] = 1;
			frameBuffer[y + 6 + width * (k + x)] = 1;
			frameBuffer[y + x + 1 + width * (k + 6)] = 1;
		}

		for (x = 1; x < 5; x++) {
			setMask(y + x, k + 1);
			setMask(y + 1, k + x + 1);
			setMask(y + 5, k + x);
			setMask(y + x + 1, k + 5);
		}

		for (x = 2; x < 4; x++) {
			frameBuffer[y + x + width * (k + 2)] = 1;
			frameBuffer[y + 2 + width * (k + x + 1)] = 1;
			frameBuffer[y + 4 + width * (k + x)] = 1;
			frameBuffer[y + x + 1 + width * (k + 4)] = 1;
		}
	}

	// Alignment blocks.
	// 插入对齐点: 前景色为二维码，背景色为掩码
	if (version > 1) {
		t = ALIGNMENT_DELTA[version];
		y = width - 7;

		for (;;) {
			x = width - 7;

			while (x > t - 3) {
				addAlignment(x, y);

				if (x < t) break;

				x -= t;
			}

			if (y <= t + 9) break;

			y -= t;

			addAlignment(6, y);
			addAlignment(y, 6);
		}
	}

	// Single foreground cell.
	// 插入单个前景色单元格: 前景色为二维码，背景色为掩码
	frameBuffer[8 + width * (width - 8)] = 1;

	// Timing gap (mask only).
	// 插入时间间隔: 掩码
	for (y = 0; y < 7; y++) {
		setMask(7, y);
		setMask(width - 8, y);
		setMask(7, y + width - 7);
	}

	for (x = 0; x < 8; x++) {
		setMask(x, 7);
		setMask(x + width - 8, 7);
		setMask(x, width - 8);
	}

	// Reserve mask, format area.
	// 保留掩码，格式化区域
	for (x = 0; x < 9; x++) {
		setMask(x, 8);
	}

	for (x = 0; x < 8; x++) {
		setMask(x + width - 8, 8);
		setMask(8, x);
	}

	for (y = 0; y < 7; y++) {
		setMask(8, y + width - 7);
	}

	// Timing row/column.
	// 插入时间间隔行/列: 掩码
	for (x = 0; x < width - 14; x++) {
		if ((x & 1) > 0) {
			setMask(8 + x, 6);
			setMask(6, 8 + x);
		} else {
			frameBuffer[8 + x + width * 6] = 1;
			frameBuffer[6 + width * (8 + x)] = 1;
		}
	}

	// Version block.
	if (version > 6) {
		t = VERSION_BLOCK[version - 7];
		k = 17;

		for (x = 0; x < 6; x++) {
			for (y = 0; y < 3; y++) {
				if ((1 & (k > 11 ? version >> (k - 12) : t >> k)) > 0) {
					frameBuffer[5 - x + width * (2 - y + width - 11)] = 1;
					frameBuffer[2 - y + width - 11 + width * (5 - x)] = 1;
				} else {
					setMask(5 - x, 2 - y + width - 11);
					setMask(2 - y + width - 11, 5 - x);
				}
				k--;
			}
		}
	}

	// Sync mask bits. Only set above for background cells, so now add the foreground.
	// 同步掩码位。只有上方的背景单元格需要设置，现在添加前景色。
	for (y = 0; y < width; y++) {
		for (x = 0; x <= y; x++) {
			if (frameBuffer[x + width * y] > 0) {
				setMask(x, y);
			}
		}
	}

	// Convert string to bit stream. 8-bit data to QR-coded 8-bit data (numeric, alphanum, or kanji
	// not supported).
	// 将字符串转换为位流。8位数据转换为QR编码的8位数据（不支持数字、字母或汉字）。
	v = str.length;

	// String to array.
	for (i = 0; i < v; i++) {
		// #ifdef APP-ANDROID
		// @ts-ignore
		eccBuffer[i.toInt()] = str.charCodeAt(i)!;
		// #endif
		// #ifndef APP-ANDROID
		eccBuffer[i] = str.charCodeAt(i)!;
		// #endif
	}

	//++++++++++++++++++++==============
	stringBuffer.set(eccBuffer.subarray(0, v));

	// Calculate max string length.
	x = dataBlock * (neccBlock1 + neccBlock2) + neccBlock2;

	if (v >= x - 2) {
		v = x - 2;

		if (version > 9) v--;
	}

	// Shift and re-pack to insert length prefix.
	// 移位并重新打包以插入长度前缀。
	i = v;

	if (version > 9) {
		stringBuffer[i + 2] = 0;
		stringBuffer[i + 3] = 0;

		while (i-- > 0) {
			t = stringBuffer[i];

			stringBuffer[i + 3] |= 255 & (t << 4);
			stringBuffer[i + 2] = t >> 4;
		}

		stringBuffer[2] |= 255 & (v << 4);
		stringBuffer[1] = v >> 4;
		stringBuffer[0] = 0x40 | (v >> 12);
	} else {
		stringBuffer[i + 1] = 0;
		stringBuffer[i + 2] = 0;

		while (i-- > 0) {
			t = stringBuffer[i];

			stringBuffer[i + 2] |= 255 & (t << 4);
			stringBuffer[i + 1] = t >> 4;
		}

		stringBuffer[1] |= 255 & (v << 4);
		stringBuffer[0] = 0x40 | (v >> 4);
	}

	// Fill to end with pad pattern.
	// 用填充模式填充到结束。
	i = v + 3 - (version < 10 ? 1 : 0);

	while (i < x) {
		stringBuffer[i++] = 0xec;
		stringBuffer[i++] = 0x11;
	}

	// Calculate generator polynomial.
	// 计算生成多项式。
	polynomial = new Uint8Array(eccBlock + 1);
	polynomial[0] = 1;

	for (i = 0; i < eccBlock; i++) {
		polynomial[i + 1] = 1;

		for (j = i; j > 0; j--) {
			polynomial[j] =
				polynomial[j] > 0
					? polynomial[j - 1] ^ GALOIS_EXPONENT[modN(GALOIS_LOG[polynomial[j]] + i)]
					: polynomial[j - 1];
		}

		polynomial[0] = GALOIS_EXPONENT[modN(GALOIS_LOG[polynomial[0]] + i)];
	}

	// Use logs for generator polynomial to save calculation step.
	// 使用对数计算生成多项式以节省计算步骤。
	for (i = 0; i < eccBlock; i++) {
		polynomial[i] = GALOIS_LOG[polynomial[i]];
	}

	// Append ECC to data buffer.
	// 将ECC附加到数据缓冲区。
	k = x;
	y = 0;

	for (i = 0; i < neccBlock1; i++) {
		appendData(y, dataBlock, k, eccBlock);

		y += dataBlock;
		k += eccBlock;
	}

	for (i = 0; i < neccBlock2; i++) {
		appendData(y, dataBlock + 1, k, eccBlock);

		y += dataBlock + 1;
		k += eccBlock;
	}

	// Interleave blocks.
	y = 0;

	for (i = 0; i < dataBlock; i++) {
		for (j = 0; j < neccBlock1; j++) {
			eccBuffer[y++] = stringBuffer[i + j * dataBlock];
		}

		for (j = 0; j < neccBlock2; j++) {
			eccBuffer[y++] = stringBuffer[neccBlock1 * dataBlock + i + j * (dataBlock + 1)];
		}
	}

	for (j = 0; j < neccBlock2; j++) {
		eccBuffer[y++] = stringBuffer[neccBlock1 * dataBlock + i + j * (dataBlock + 1)];
	}

	for (i = 0; i < eccBlock; i++) {
		for (j = 0; j < neccBlock1 + neccBlock2; j++) {
			eccBuffer[y++] = stringBuffer[x + i + j * eccBlock];
		}
	}

	stringBuffer.set(eccBuffer);

	// Pack bits into frame avoiding masked area.
	// 将位流打包到帧中，避免掩码区域。
	x = width - 1;
	y = width - 1;
	k = 1;
	v = 1;

	// inteleaved data and ECC codes.
	// 交错数据和ECC代码。
	m = (dataBlock + eccBlock) * (neccBlock1 + neccBlock2) + neccBlock2;

	for (i = 0; i < m; i++) {
		t = stringBuffer[i];

		for (j = 0; j < 8; j++) {
			if ((0x80 & t) > 0) {
				frameBuffer[x + width * y] = 1;
			}

			// Find next fill position.
			// 找到下一个填充位置。
			do {
				if (v > 0) {
					x--;
				} else {
					x++;

					if (k > 0) {
						if (y != 0) {
							y--;
						} else {
							x -= 2;
							k = k == 0 ? 1 : 0;

							if (x == 6) {
								x--;
								y = 9;
							}
						}
					} else {
						if (y != width - 1) {
							y++;
						} else {
							x -= 2;
							k = k == 0 ? 1 : 0;

							if (x == 6) {
								x--;
								y -= 8;
							}
						}
					}
				}

				v = v == 0 ? 1 : 0;
			} while (isMasked(x, y));
			t <<= 1;
		}
	}

	// Save pre-mask copy of frame.
	const frameBufferCopy = frameBuffer.slice(0);

	t = 0;
	y = 30000;

	// Using `for` instead of `while` since in original Arduino code if an early mask was *good
	// enough* it wouldn't try for a better one since they get more complex and take longer.
	// 使用`for`而不是`while`，因为在原始Arduino代码中，如果早期掩码足够好，它不会尝试更好的掩码，因为它们变得更复杂并需要更长的时间。
	for (k = 0; k < 8; k++) {
		// Returns foreground-background imbalance.
		// 返回前景色和背景色的不平衡。
		applyMask(k);

		x = checkBadness();

		// Is current mask better than previous best?
		// 当前掩码是否比之前的最佳掩码更好？
		if (x < y) {
			y = x;
			t = k;
		}

		// Don't increment `i` to a void redoing mask.
		// 不要增加`i`以避免重新做掩码。
		if (t == 7) break;

		// Reset for next pass.
		// 重置下一个循环。
		frameBuffer.set(frameBufferCopy);
	}

	// Redo best mask as none were *good enough* (i.e. last wasn't `t`).
	// 重做最佳掩码，因为没有一个掩码足够好（即最后一个不是`t`）。
	if (t != k) {
		// Reset buffer to pre-mask state before applying the best one
		frameBuffer.set(frameBufferCopy);
		applyMask(t);
	}

	// Add in final mask/ECC level bytes.
	// 添加最终的掩码/ECC级别字节。
	y = FINAL_FORMAT[t + ((eccLevel - 1) << 3)];

	// Low byte.
	for (k = 0; k < 8; k++) {
		if ((y & 1) > 0) {
			frameBuffer[width - 1 - k + width * 8] = 1;

			if (k < 6) {
				frameBuffer[8 + width * k] = 1;
			} else {
				frameBuffer[8 + width * (k + 1)] = 1;
			}
		}
		y >>= 1;
	}

	// High byte.
	for (k = 0; k < 7; k++) {
		if ((y & 1) > 0) {
			frameBuffer[8 + width * (width - 7 + k)] = 1;

			if (k > 0) {
				frameBuffer[6 - k + width * 8] = 1;
			} else {
				frameBuffer[7 + width * 8] = 1;
			}
		}
		y >>= 1;
	}

	// Finally, return the image data.
	return {
		frameBuffer: frameBuffer,
		width: width
	} as GenerateFrameResult;
}
