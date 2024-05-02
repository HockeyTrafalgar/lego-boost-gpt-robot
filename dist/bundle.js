(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)

},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubControl = void 0;
var manual_1 = require("./states/manual");
var ai_1 = require("./states/ai");
var HubControl = /** @class */ (function () {
    function HubControl(deviceInfo, controlData, configuration) {
        this.hub = null;
        this.device = deviceInfo;
        this.control = controlData;
        this.configuration = configuration;
        this.prevControl = __assign({}, this.control);
        this.states = {
            Turn: ai_1.turn,
            Drive: ai_1.drive,
            Stop: ai_1.stop,
            Back: ai_1.back,
            Manual: manual_1.manual,
            Seek: ai_1.seek,
        };
        this.currentState = this.states['Manual'];
    }
    HubControl.prototype.updateConfiguration = function (configuration) {
        this.configuration = configuration;
    };
    HubControl.prototype.start = function (hub) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.hub = hub;
                        this.device.connected = true;
                        this.hub.emitter.on('error', function (err) {
                            _this.device.err = err;
                        });
                        this.hub.emitter.on('disconnect', function () {
                            _this.device.connected = false;
                        });
                        this.hub.emitter.on('distance', function (distance) {
                            _this.device.distance = distance;
                        });
                        this.hub.emitter.on('rssi', function (rssi) {
                            _this.device.rssi = rssi;
                        });
                        this.hub.emitter.on('port', function (portObject) {
                            var port = portObject.port, action = portObject.action;
                            _this.device.ports[port].action = action;
                        });
                        this.hub.emitter.on('color', function (color) {
                            _this.device.color = color;
                        });
                        this.hub.emitter.on('tilt', function (tilt) {
                            var roll = tilt.roll, pitch = tilt.pitch;
                            _this.device.tilt.roll = roll;
                            _this.device.tilt.pitch = pitch;
                        });
                        this.hub.emitter.on('rotation', function (rotation) {
                            var port = rotation.port, angle = rotation.angle;
                            _this.device.ports[port].angle = angle;
                        });
                        return [4 /*yield*/, this.hub.ledAsync('red')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.hub.ledAsync('yellow')];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.hub.ledAsync('green')];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HubControl.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.device.connected) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.hub.disconnectAsync()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    HubControl.prototype.setNextState = function (state) {
        this.control.controlUpdateTime = undefined;
        this.control.state = state;
        this.currentState = this.states[state];
    };
    HubControl.prototype.update = function () {
        // TODO: After removing bind, this requires some more refactoring
        this.currentState(this);
        // TODO: Deep clone
        this.prevControl = __assign({}, this.control);
        this.prevControl.tilt = __assign({}, this.control.tilt);
        this.prevDevice = __assign({}, this.device);
    };
    return HubControl;
}());
exports.HubControl = HubControl;

},{"./states/ai":5,"./states/manual":6}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seek = exports.turn = exports.drive = exports.back = exports.stop = void 0;
var MIN_DISTANCE = 75;
var OK_DISTANCE = 100;
var EXECUTE_TIME_SEC = 60;
var CHECK_TIME_MS = 59000;
// Speeds must be between -100 and 100
var TURN_SPEED = 30;
var TURN_SPEED_OPPOSITE = -10;
var DRIVE_SPEED = 30;
var REVERSE_SPEED = -15;
var seek = function (hubControl) {
    if (!hubControl.control.controlUpdateTime || Date.now() - hubControl.control.controlUpdateTime > CHECK_TIME_MS) {
        hubControl.control.controlUpdateTime = Date.now();
        hubControl.hub.motorTimeMulti(EXECUTE_TIME_SEC, TURN_SPEED, TURN_SPEED_OPPOSITE);
    }
    if (Date.now() - hubControl.control.controlUpdateTime < 250)
        return;
    if (hubControl.device.distance > hubControl.prevDevice.distance) {
        hubControl.control.turnDirection = 'right';
        hubControl.setNextState('Turn');
    }
    else {
        hubControl.control.turnDirection = 'left';
        hubControl.setNextState('Turn');
    }
};
exports.seek = seek;
var turn = function (hubControl) {
    if (hubControl.device.distance < MIN_DISTANCE) {
        hubControl.control.turnDirection = null;
        hubControl.setNextState('Back');
        return;
    }
    else if (hubControl.device.distance > OK_DISTANCE) {
        hubControl.control.turnDirection = null;
        hubControl.setNextState('Drive');
        return;
    }
    if (!hubControl.control.controlUpdateTime || Date.now() - hubControl.control.controlUpdateTime > CHECK_TIME_MS) {
        var motorA = hubControl.control.turnDirection === 'right' ? TURN_SPEED : TURN_SPEED_OPPOSITE;
        var motorB = hubControl.control.turnDirection === 'right' ? TURN_SPEED_OPPOSITE : TURN_SPEED;
        hubControl.control.controlUpdateTime = Date.now();
        hubControl.hub.motorTimeMulti(EXECUTE_TIME_SEC, motorA, motorB);
    }
};
exports.turn = turn;
var drive = function (hubControl) {
    if (hubControl.device.distance < MIN_DISTANCE) {
        hubControl.setNextState('Back');
        return;
    }
    else if (hubControl.device.distance < OK_DISTANCE) {
        hubControl.setNextState('Seek');
        return;
    }
    if (!hubControl.control.controlUpdateTime || Date.now() - hubControl.control.controlUpdateTime > CHECK_TIME_MS) {
        hubControl.control.controlUpdateTime = Date.now();
        var speed = hubControl.configuration.leftMotor === 'A' ? DRIVE_SPEED : DRIVE_SPEED * -1;
        hubControl.hub.motorTimeMulti(EXECUTE_TIME_SEC, speed, speed);
    }
};
exports.drive = drive;
var back = function (hubControl) {
    if (hubControl.device.distance > OK_DISTANCE) {
        hubControl.setNextState('Seek');
        return;
    }
    if (!hubControl.control.controlUpdateTime || Date.now() - hubControl.control.controlUpdateTime > CHECK_TIME_MS) {
        hubControl.control.controlUpdateTime = Date.now();
        var speed = hubControl.configuration.leftMotor === 'A' ? REVERSE_SPEED : REVERSE_SPEED * -1;
        hubControl.hub.motorTimeMulti(EXECUTE_TIME_SEC, speed, speed);
    }
};
exports.back = back;
var stop = function (hubControl) {
    hubControl.control.speed = 0;
    hubControl.control.turnAngle = 0;
    if (!hubControl.control.controlUpdateTime || Date.now() - hubControl.control.controlUpdateTime > CHECK_TIME_MS) {
        hubControl.control.controlUpdateTime = Date.now();
        hubControl.hub.motorTimeMulti(EXECUTE_TIME_SEC, 0, 0);
    }
};
exports.stop = stop;

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manual = void 0;
function manual(hubControl) {
    if (hubControl.control.speed !== hubControl.prevControl.speed || hubControl.control.turnAngle !== hubControl.prevControl.turnAngle) {
        var motorA = hubControl.control.speed + (hubControl.control.turnAngle > 0 ? Math.abs(hubControl.control.turnAngle) : 0);
        var motorB = hubControl.control.speed + (hubControl.control.turnAngle < 0 ? Math.abs(hubControl.control.turnAngle) : 0);
        if (motorA > 100) {
            motorB -= motorA - 100;
            motorA = 100;
        }
        if (motorB > 100) {
            motorA -= motorB - 100;
            motorB = 100;
        }
        hubControl.control.motorA = motorA;
        hubControl.control.motorB = motorB;
        hubControl.hub.motorTimeMulti(60, motorA, motorB);
    }
    if (hubControl.control.tilt.pitch !== hubControl.prevControl.tilt.pitch) {
        hubControl.hub.motorTime('C', 60, hubControl.control.tilt.pitch);
    }
    if (hubControl.control.tilt.roll !== hubControl.prevControl.tilt.roll) {
        hubControl.hub.motorTime('D', 60, hubControl.control.tilt.roll);
    }
}
exports.manual = manual;

},{}],7:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostConnector = void 0;
var BOOST_HUB_SERVICE_UUID = '00001623-1212-efde-1623-785feabcd123';
var BOOST_CHARACTERISTIC_UUID = '00001624-1212-efde-1623-785feabcd123';
var BoostConnector = /** @class */ (function () {
    function BoostConnector() {
    }
    BoostConnector.connect = function (disconnectCallback) {
        return __awaiter(this, void 0, void 0, function () {
            var options, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        options = {
                            acceptAllDevices: false,
                            filters: [{ services: [BOOST_HUB_SERVICE_UUID] }],
                            optionalServices: [BOOST_HUB_SERVICE_UUID],
                        };
                        _a = this;
                        return [4 /*yield*/, navigator.bluetooth.requestDevice(options)];
                    case 1:
                        _a.device = _b.sent();
                        this.device.addEventListener('gattserverdisconnected', function (event) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, disconnectCallback()];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        // await this.device.watchAdvertisements();
                        // this.device.addEventListener('advertisementreceived', event => {
                        //   // @ts-ignore
                        //   console.log(event.rssi);
                        // });
                        return [2 /*return*/, BoostConnector.getCharacteristic(this.device)];
                }
            });
        });
    };
    BoostConnector.getCharacteristic = function (device) {
        return __awaiter(this, void 0, void 0, function () {
            var server, service;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, device.gatt.connect()];
                    case 1:
                        server = _a.sent();
                        return [4 /*yield*/, server.getPrimaryService(BOOST_HUB_SERVICE_UUID)];
                    case 2:
                        service = _a.sent();
                        return [4 /*yield*/, service.getCharacteristic(BOOST_CHARACTERISTIC_UUID)];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    BoostConnector.reconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var bluetooth;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.device) return [3 /*break*/, 2];
                        return [4 /*yield*/, BoostConnector.getCharacteristic(this.device)];
                    case 1:
                        bluetooth = _a.sent();
                        return [2 /*return*/, [true, bluetooth]];
                    case 2: return [2 /*return*/, [false, null]];
                }
            });
        });
    };
    BoostConnector.disconnect = function () {
        if (this.device) {
            this.device.gatt.disconnect();
            return true;
        }
        return false;
    };
    BoostConnector.isWebBluetoothSupported = navigator.bluetooth ? true : false;
    return BoostConnector;
}());
exports.BoostConnector = BoostConnector;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var legoBoost_1 = require("./legoBoost");
var boost = new legoBoost_1.default();
// @ts-ignore
window.boost = boost;
// @ts-ignore
boost.logDebug = console.log;

},{"./legoBoost":13}],9:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.kMaxLength = exports.INSPECT_MAX_BYTES = exports.SlowBuffer = exports.Buffer = void 0;
var base64 = Promise.resolve().then(function () { return require('base64-js'); });
var ieee754 = Promise.resolve().then(function () { return require('ieee754'); });
var INSPECT_MAX_BYTES = 50;
exports.INSPECT_MAX_BYTES = INSPECT_MAX_BYTES;
var K_MAX_LENGTH = 0x7fffffff;
var kMaxLength = K_MAX_LENGTH;
exports.kMaxLength = kMaxLength;
/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();
if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
    console.error('This browser lacks typed array (Uint8Array) support which is required by ' +
        '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.');
}
function typedArraySupport() {
    // Can typed array instances can be augmented?
    try {
        var arr = new Uint8Array(1);
        // @ts-ignore
        arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42; } };
        // @ts-ignore
        return arr.foo() === 42;
    }
    catch (e) {
        return false;
    }
}
Object.defineProperty(Buffer.prototype, 'parent', {
    enumerable: true,
    get: function () {
        if (!Buffer.isBuffer(this))
            return undefined;
        return this.buffer;
    }
});
Object.defineProperty(Buffer.prototype, 'offset', {
    enumerable: true,
    get: function () {
        if (!Buffer.isBuffer(this))
            return undefined;
        return this.byteOffset;
    }
});
function createBuffer(length) {
    if (length > K_MAX_LENGTH) {
        throw new RangeError('The value "' + length + '" is invalid for option "size"');
    }
    // Return an augmented `Uint8Array` instance
    var buf = new Uint8Array(length);
    // @ts-ignore
    buf.__proto__ = Buffer.prototype;
    return buf;
}
/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */
function Buffer(arg, encodingOrOffset, length) {
    // Common case.
    if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
            throw new TypeError('The "string" argument must be of type string. Received type number');
        }
        return allocUnsafe(arg);
    }
    return from(arg, encodingOrOffset, length);
}
exports.Buffer = Buffer;
// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
    Object.defineProperty(Buffer, Symbol.species, {
        value: null,
        configurable: true,
        enumerable: false,
        writable: false
    });
}
Buffer.poolSize = 8192; // not used by this implementation
function from(value, encodingOrOffset, length) {
    if (typeof value === 'string') {
        return fromString(value, encodingOrOffset);
    }
    if (ArrayBuffer.isView(value)) {
        return fromArrayLike(value);
    }
    if (value == null) {
        throw TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
            'or Array-like Object. Received type ' + (typeof value));
    }
    if (isInstance(value, ArrayBuffer) ||
        (value && isInstance(value.buffer, ArrayBuffer))) {
        return fromArrayBuffer(value, encodingOrOffset, length);
    }
    if (typeof value === 'number') {
        throw new TypeError('The "value" argument must not be of type number. Received type number');
    }
    var valueOf = value.valueOf && value.valueOf();
    if (valueOf != null && valueOf !== value) {
        return Buffer.from(valueOf, encodingOrOffset, length);
    }
    var b = fromObject(value);
    if (b)
        return b;
    if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
        typeof value[Symbol.toPrimitive] === 'function') {
        return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length);
    }
    throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
        'or Array-like Object. Received type ' + (typeof value));
}
/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
    return from(value, encodingOrOffset, length);
};
// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype;
Buffer.__proto__ = Uint8Array;
function assertSize(size) {
    if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be of type number');
    }
    else if (size < 0) {
        throw new RangeError('The value "' + size + '" is invalid for option "size"');
    }
}
function alloc(size, fill, encoding) {
    assertSize(size);
    if (size <= 0) {
        return createBuffer(size);
    }
    if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpretted as a start offset.
        return typeof encoding === 'string'
            // @ts-ignore
            ? createBuffer(size).fill(fill, encoding)
            : createBuffer(size).fill(fill);
    }
    return createBuffer(size);
}
/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
    return alloc(size, fill, encoding);
};
function allocUnsafe(size) {
    assertSize(size);
    return createBuffer(size < 0 ? 0 : checked(size) | 0);
}
/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
    return allocUnsafe(size);
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
    return allocUnsafe(size);
};
function fromString(string, encoding) {
    if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8';
    }
    if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('Unknown encoding: ' + encoding);
    }
    var length = byteLength(string, encoding) | 0;
    var buf = createBuffer(length);
    // @ts-ignore
    var actual = buf.write(string, encoding);
    if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        buf = buf.slice(0, actual);
    }
    return buf;
}
function fromArrayLike(array) {
    var length = array.length < 0 ? 0 : checked(array.length) | 0;
    var buf = createBuffer(length);
    for (var i = 0; i < length; i += 1) {
        buf[i] = array[i] & 255;
    }
    return buf;
}
function fromArrayBuffer(array, byteOffset, length) {
    if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('"offset" is outside of buffer bounds');
    }
    if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('"length" is outside of buffer bounds');
    }
    var buf;
    if (byteOffset === undefined && length === undefined) {
        buf = new Uint8Array(array);
    }
    else if (length === undefined) {
        buf = new Uint8Array(array, byteOffset);
    }
    else {
        buf = new Uint8Array(array, byteOffset, length);
    }
    // Return an augmented `Uint8Array` instance
    buf.__proto__ = Buffer.prototype;
    return buf;
}
function fromObject(obj) {
    if (Buffer.isBuffer(obj)) {
        var len = checked(obj.length) | 0;
        var buf = createBuffer(len);
        if (buf.length === 0) {
            return buf;
        }
        obj.copy(buf, 0, 0, len);
        return buf;
    }
    if (obj.length !== undefined) {
        if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
            return createBuffer(0);
        }
        return fromArrayLike(obj);
    }
    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
        return fromArrayLike(obj.data);
    }
}
function checked(length) {
    // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= K_MAX_LENGTH) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
            'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes');
    }
    return length | 0;
}
function SlowBuffer(length) {
    if (+length != length) { // eslint-disable-line eqeqeq
        length = 0;
    }
    // @ts-ignore
    return Buffer.alloc(+length);
}
exports.SlowBuffer = SlowBuffer;
Buffer.isBuffer = function isBuffer(b) {
    return b != null && b._isBuffer === true &&
        b !== Buffer.prototype; // so Buffer.isBuffer(Buffer.prototype) will be false
};
Buffer.compare = function compare(a, b) {
    if (isInstance(a, Uint8Array))
        a = Buffer.from(a, a.offset, a.byteLength);
    if (isInstance(b, Uint8Array))
        b = Buffer.from(b, b.offset, b.byteLength);
    if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
        throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
    }
    if (a === b)
        return 0;
    var x = a.length;
    var y = b.length;
    for (var i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
        }
    }
    if (x < y)
        return -1;
    if (y < x)
        return 1;
    return 0;
};
Buffer.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
            return true;
        default:
            return false;
    }
};
Buffer.concat = function concat(list, length) {
    if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
    }
    if (list.length === 0) {
        // @ts-ignore
        return Buffer.alloc(0);
    }
    var i;
    if (length === undefined) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
            length += list[i].length;
        }
    }
    var buffer = Buffer.allocUnsafe(length);
    var pos = 0;
    for (i = 0; i < list.length; ++i) {
        var buf = list[i];
        if (isInstance(buf, Uint8Array)) {
            // @ts-ignore
            buf = Buffer.from(buf);
        }
        if (!Buffer.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
        }
        buf.copy(buffer, pos);
        pos += buf.length;
    }
    return buffer;
};
function byteLength(string, encoding) {
    if (Buffer.isBuffer(string)) {
        return string.length;
    }
    if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
        return string.byteLength;
    }
    if (typeof string !== 'string') {
        throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
            'Received type ' + typeof string);
    }
    var len = string.length;
    var mustMatch = (arguments.length > 2 && arguments[2] === true);
    if (!mustMatch && len === 0)
        return 0;
    // Use a for loop to avoid recursion
    var loweredCase = false;
    for (;;) {
        switch (encoding) {
            case 'ascii':
            case 'latin1':
            case 'binary':
                return len;
            case 'utf8':
            case 'utf-8':
                // @ts-ignore
                return utf8ToBytes(string).length;
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
                return len * 2;
            case 'hex':
                return len >>> 1;
            case 'base64':
                return base64ToBytes(string).length;
            default:
                if (loweredCase) {
                    // @ts-ignore
                    return mustMatch ? -1 : utf8ToBytes(string).length; // assume utf8
                }
                encoding = ('' + encoding).toLowerCase();
                loweredCase = true;
        }
    }
}
Buffer.byteLength = byteLength;
function slowToString(encoding, start, end) {
    var loweredCase = false;
    // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    // property of a typed array.
    // This behaves neither like String nor Uint8Array in that we set start/end
    // to their upper/lower bounds if the value passed is out of range.
    // undefined is handled specially as per ECMA-262 6th Edition,
    // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
    if (start === undefined || start < 0) {
        start = 0;
    }
    // Return early if start > this.length. Done here to prevent potential uint32
    // coercion fail below.
    if (start > this.length) {
        return '';
    }
    if (end === undefined || end > this.length) {
        end = this.length;
    }
    if (end <= 0) {
        return '';
    }
    // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
    end >>>= 0;
    start >>>= 0;
    if (end <= start) {
        return '';
    }
    if (!encoding)
        encoding = 'utf8';
    while (true) {
        switch (encoding) {
            case 'hex':
                return hexSlice(this, start, end);
            case 'utf8':
            case 'utf-8':
                return utf8Slice(this, start, end);
            case 'ascii':
                return asciiSlice(this, start, end);
            case 'latin1':
            case 'binary':
                return latin1Slice(this, start, end);
            case 'base64':
                return base64Slice(this, start, end);
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
                return utf16leSlice(this, start, end);
            default:
                if (loweredCase)
                    throw new TypeError('Unknown encoding: ' + encoding);
                encoding = (encoding + '').toLowerCase();
                loweredCase = true;
        }
    }
}
// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true;
function swap(b, n, m) {
    var i = b[n];
    b[n] = b[m];
    b[m] = i;
}
Buffer.prototype.swap16 = function swap16() {
    var len = this.length;
    if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits');
    }
    for (var i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
    }
    return this;
};
Buffer.prototype.swap32 = function swap32() {
    var len = this.length;
    if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits');
    }
    for (var i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
    }
    return this;
};
Buffer.prototype.swap64 = function swap64() {
    var len = this.length;
    if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits');
    }
    for (var i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
    }
    return this;
};
Buffer.prototype.toString = function toString() {
    var length = this.length;
    if (length === 0)
        return '';
    if (arguments.length === 0)
        return utf8Slice(this, 0, length);
    return slowToString.apply(this, arguments);
};
Buffer.prototype.toLocaleString = Buffer.prototype.toString;
Buffer.prototype.equals = function equals(b) {
    if (!Buffer.isBuffer(b))
        throw new TypeError('Argument must be a Buffer');
    if (this === b)
        return true;
    return Buffer.compare(this, b) === 0;
};
Buffer.prototype.inspect = function inspect() {
    var str = '';
    var max = INSPECT_MAX_BYTES;
    str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
    if (this.length > max)
        str += ' ... ';
    return '<Buffer ' + str + '>';
};
Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
    if (isInstance(target, Uint8Array)) {
        target = Buffer.from(target, target.offset, target.byteLength);
    }
    if (!Buffer.isBuffer(target)) {
        throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. ' +
            'Received type ' + (typeof target));
    }
    if (start === undefined) {
        start = 0;
    }
    if (end === undefined) {
        end = target ? target.length : 0;
    }
    if (thisStart === undefined) {
        thisStart = 0;
    }
    if (thisEnd === undefined) {
        thisEnd = this.length;
    }
    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index');
    }
    if (thisStart >= thisEnd && start >= end) {
        return 0;
    }
    if (thisStart >= thisEnd) {
        return -1;
    }
    if (start >= end) {
        return 1;
    }
    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;
    if (this === target)
        return 0;
    var x = thisEnd - thisStart;
    var y = end - start;
    var len = Math.min(x, y);
    var thisCopy = this.slice(thisStart, thisEnd);
    var targetCopy = target.slice(start, end);
    for (var i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
        }
    }
    if (x < y)
        return -1;
    if (y < x)
        return 1;
    return 0;
};
// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
    // Empty buffer means no match
    if (buffer.length === 0)
        return -1;
    // Normalize byteOffset
    if (typeof byteOffset === 'string') {
        encoding = byteOffset;
        byteOffset = 0;
    }
    else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
    }
    else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
    }
    byteOffset = +byteOffset; // Coerce to Number.
    if (numberIsNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1);
    }
    // Normalize byteOffset: negative offsets start from the end of the buffer
    if (byteOffset < 0)
        byteOffset = buffer.length + byteOffset;
    if (byteOffset >= buffer.length) {
        if (dir)
            return -1;
        else
            byteOffset = buffer.length - 1;
    }
    else if (byteOffset < 0) {
        if (dir)
            byteOffset = 0;
        else
            return -1;
    }
    // Normalize val
    if (typeof val === 'string') {
        // @ts-ignore
        val = Buffer.from(val, encoding);
    }
    // Finally, search either indexOf (if dir is true) or lastIndexOf
    if (Buffer.isBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
            return -1;
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
    }
    else if (typeof val === 'number') {
        val = val & 0xFF; // Search for a byte value [0-255]
        if (typeof Uint8Array.prototype.indexOf === 'function') {
            if (dir) {
                return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
            }
            else {
                return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
            }
        }
        return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
    }
    throw new TypeError('val must be string, number or Buffer');
}
function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
    var indexSize = 1;
    var arrLength = arr.length;
    var valLength = val.length;
    if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase();
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
            if (arr.length < 2 || val.length < 2) {
                return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
        }
    }
    function read(buf, i) {
        if (indexSize === 1) {
            return buf[i];
        }
        else {
            return buf.readUInt16BE(i * indexSize);
        }
    }
    var i;
    if (dir) {
        var foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
            if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
                if (foundIndex === -1)
                    foundIndex = i;
                if (i - foundIndex + 1 === valLength)
                    return foundIndex * indexSize;
            }
            else {
                if (foundIndex !== -1)
                    i -= i - foundIndex;
                foundIndex = -1;
            }
        }
    }
    else {
        if (byteOffset + valLength > arrLength)
            byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
            var found = true;
            for (var j = 0; j < valLength; j++) {
                if (read(arr, i + j) !== read(val, j)) {
                    found = false;
                    break;
                }
            }
            if (found)
                return i;
        }
    }
    return -1;
}
Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1;
};
Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
};
Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
};
function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    var remaining = buf.length - offset;
    if (!length) {
        length = remaining;
    }
    else {
        length = Number(length);
        if (length > remaining) {
            length = remaining;
        }
    }
    var strLen = string.length;
    if (length > strLen / 2) {
        length = strLen / 2;
    }
    for (var i = 0; i < length; ++i) {
        var parsed = parseInt(string.substr(i * 2, 2), 16);
        if (numberIsNaN(parsed))
            return i;
        buf[offset + i] = parsed;
    }
    return i;
}
function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
}
function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
}
function latin1Write(buf, string, offset, length) {
    return asciiWrite(buf, string, offset, length);
}
function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
}
function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
}
Buffer.prototype.write = function write(string, offset, length, encoding) {
    // Buffer#write(string)
    if (offset === undefined) {
        encoding = 'utf8';
        length = this.length;
        offset = 0;
        // Buffer#write(string, encoding)
    }
    else if (length === undefined && typeof offset === 'string') {
        encoding = offset;
        length = this.length;
        offset = 0;
        // Buffer#write(string, offset[, length][, encoding])
    }
    else if (isFinite(offset)) {
        offset = offset >>> 0;
        if (isFinite(length)) {
            length = length >>> 0;
            if (encoding === undefined)
                encoding = 'utf8';
        }
        else {
            encoding = length;
            length = undefined;
        }
    }
    else {
        throw new Error('Buffer.write(string, encoding, offset[, length]) is no longer supported');
    }
    var remaining = this.length - offset;
    if (length === undefined || length > remaining)
        length = remaining;
    if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds');
    }
    if (!encoding)
        encoding = 'utf8';
    var loweredCase = false;
    for (;;) {
        switch (encoding) {
            case 'hex':
                return hexWrite(this, string, offset, length);
            case 'utf8':
            case 'utf-8':
                return utf8Write(this, string, offset, length);
            case 'ascii':
                return asciiWrite(this, string, offset, length);
            case 'latin1':
            case 'binary':
                return latin1Write(this, string, offset, length);
            case 'base64':
                // Warning: maxLength not taken into account in base64Write
                return base64Write(this, string, offset, length);
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
                return ucs2Write(this, string, offset, length);
            default:
                if (loweredCase)
                    throw new TypeError('Unknown encoding: ' + encoding);
                encoding = ('' + encoding).toLowerCase();
                loweredCase = true;
        }
    }
};
Buffer.prototype.toJSON = function toJSON() {
    return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
    };
};
function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
        // @ts-ignore
        return base64.fromByteArray(buf);
    }
    else {
        // @ts-ignore
        return base64.fromByteArray(buf.slice(start, end));
    }
}
function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    var res = [];
    var i = start;
    while (i < end) {
        var firstByte = buf[i];
        var codePoint = null;
        var bytesPerSequence = (firstByte > 0xEF) ? 4
            : (firstByte > 0xDF) ? 3
                : (firstByte > 0xBF) ? 2
                    : 1;
        if (i + bytesPerSequence <= end) {
            var secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
                case 1:
                    if (firstByte < 0x80) {
                        codePoint = firstByte;
                    }
                    break;
                case 2:
                    secondByte = buf[i + 1];
                    if ((secondByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                        if (tempCodePoint > 0x7F) {
                            codePoint = tempCodePoint;
                        }
                    }
                    break;
                case 3:
                    secondByte = buf[i + 1];
                    thirdByte = buf[i + 2];
                    if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                        if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                            codePoint = tempCodePoint;
                        }
                    }
                    break;
                case 4:
                    secondByte = buf[i + 1];
                    thirdByte = buf[i + 2];
                    fourthByte = buf[i + 3];
                    if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                        if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                            codePoint = tempCodePoint;
                        }
                    }
            }
        }
        if (codePoint === null) {
            // we did not generate a valid codePoint so insert a
            // replacement char (U+FFFD) and advance only 1 byte
            codePoint = 0xFFFD;
            bytesPerSequence = 1;
        }
        else if (codePoint > 0xFFFF) {
            // encode to utf16 (surrogate pair dance)
            codePoint -= 0x10000;
            res.push(codePoint >>> 10 & 0x3FF | 0xD800);
            codePoint = 0xDC00 | codePoint & 0x3FF;
        }
        res.push(codePoint);
        i += bytesPerSequence;
    }
    return decodeCodePointsArray(res);
}
// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;
function decodeCodePointsArray(codePoints) {
    var len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
    }
    // Decode in chunks to avoid "call stack size exceeded".
    var res = '';
    var i = 0;
    while (i < len) {
        res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
    }
    return res;
}
function asciiSlice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);
    for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F);
    }
    return ret;
}
function latin1Slice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);
    for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
    }
    return ret;
}
function hexSlice(buf, start, end) {
    var len = buf.length;
    if (!start || start < 0)
        start = 0;
    if (!end || end < 0 || end > len)
        end = len;
    var out = '';
    for (var i = start; i < end; ++i) {
        out += toHex(buf[i]);
    }
    return out;
}
function utf16leSlice(buf, start, end) {
    var bytes = buf.slice(start, end);
    var res = '';
    for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
    }
    return res;
}
Buffer.prototype.slice = function slice(start, end) {
    var len = this.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;
    if (start < 0) {
        start += len;
        if (start < 0)
            start = 0;
    }
    else if (start > len) {
        start = len;
    }
    if (end < 0) {
        end += len;
        if (end < 0)
            end = 0;
    }
    else if (end > len) {
        end = len;
    }
    if (end < start)
        end = start;
    var newBuf = this.subarray(start, end);
    // Return an augmented `Uint8Array` instance
    newBuf.__proto__ = Buffer.prototype;
    return newBuf;
};
/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset(offset, ext, length) {
    if ((offset % 1) !== 0 || offset < 0)
        throw new RangeError('offset is not uint');
    if (offset + ext > length)
        throw new RangeError('Trying to access beyond buffer length');
}
Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
    offset = offset >>> 0;
    byteLength = byteLength >>> 0;
    if (!noAssert)
        checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
    }
    return val;
};
Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
    offset = offset >>> 0;
    byteLength = byteLength >>> 0;
    if (!noAssert) {
        checkOffset(offset, byteLength, this.length);
    }
    var val = this[offset + --byteLength];
    var mul = 1;
    while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul;
    }
    return val;
};
Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 1, this.length);
    return this[offset];
};
Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 2, this.length);
    return this[offset] | (this[offset + 1] << 8);
};
Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 2, this.length);
    return (this[offset] << 8) | this[offset + 1];
};
Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 4, this.length);
    return ((this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16)) +
        (this[offset + 3] * 0x1000000);
};
Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 4, this.length);
    return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
            (this[offset + 2] << 8) |
            this[offset + 3]);
};
Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
    offset = offset >>> 0;
    byteLength = byteLength >>> 0;
    if (!noAssert)
        checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
    }
    mul *= 0x80;
    if (val >= mul)
        val -= Math.pow(2, 8 * byteLength);
    return val;
};
Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
    offset = offset >>> 0;
    byteLength = byteLength >>> 0;
    if (!noAssert)
        checkOffset(offset, byteLength, this.length);
    var i = byteLength;
    var mul = 1;
    var val = this[offset + --i];
    while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul;
    }
    mul *= 0x80;
    if (val >= mul)
        val -= Math.pow(2, 8 * byteLength);
    return val;
};
Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 1, this.length);
    if (!(this[offset] & 0x80))
        return (this[offset]);
    return ((0xff - this[offset] + 1) * -1);
};
Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 2, this.length);
    var val = this[offset] | (this[offset + 1] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val;
};
Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 2, this.length);
    var val = this[offset + 1] | (this[offset] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val;
};
Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 4, this.length);
    return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24);
};
Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 4, this.length);
    return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3]);
};
Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 4, this.length);
    // @ts-ignore
    return ieee754.read(this, offset, true, 23, 4);
};
Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 4, this.length);
    // @ts-ignore
    return ieee754.read(this, offset, false, 23, 4);
};
Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 8, this.length);
    // @ts-ignore
    return ieee754.read(this, offset, true, 52, 8);
};
Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert)
        checkOffset(offset, 8, this.length);
    // @ts-ignore
    return ieee754.read(this, offset, false, 52, 8);
};
function checkInt(buf, value, offset, ext, max, min) {
    if (!Buffer.isBuffer(buf))
        throw new TypeError('"buffer" argument must be a Buffer instance');
    if (value > max || value < min)
        throw new RangeError('"value" argument is out of bounds');
    if (offset + ext > buf.length)
        throw new RangeError('Index out of range');
}
Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset >>> 0;
    byteLength = byteLength >>> 0;
    if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
    }
    var mul = 1;
    var i = 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
    }
    return offset + byteLength;
};
Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset >>> 0;
    byteLength = byteLength >>> 0;
    if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
    }
    var i = byteLength - 1;
    var mul = 1;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
    }
    return offset + byteLength;
};
Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 1, 0xff, 0);
    this[offset] = (value & 0xff);
    return offset + 1;
};
Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 2, 0xffff, 0);
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    return offset + 2;
};
Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 2, 0xffff, 0);
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
    return offset + 2;
};
Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 4, 0xffffffff, 0);
    this[offset + 3] = (value >>> 24);
    this[offset + 2] = (value >>> 16);
    this[offset + 1] = (value >>> 8);
    this[offset] = (value & 0xff);
    return offset + 4;
};
Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 4, 0xffffffff, 0);
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
    return offset + 4;
};
Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
        var limit = Math.pow(2, (8 * byteLength) - 1);
        checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }
    var i = 0;
    var mul = 1;
    var sub = 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }
    return offset + byteLength;
};
Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
        var limit = Math.pow(2, (8 * byteLength) - 1);
        checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }
    var i = byteLength - 1;
    var mul = 1;
    var sub = 0;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }
    return offset + byteLength;
};
Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 1, 0x7f, -0x80);
    if (value < 0)
        value = 0xff + value + 1;
    this[offset] = (value & 0xff);
    return offset + 1;
};
Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    return offset + 2;
};
Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
    return offset + 2;
};
Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    this[offset + 2] = (value >>> 16);
    this[offset + 3] = (value >>> 24);
    return offset + 4;
};
Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert)
        checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (value < 0)
        value = 0xffffffff + value + 1;
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
    return offset + 4;
};
function checkIEEE754(buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length)
        throw new RangeError('Index out of range');
    if (offset < 0)
        throw new RangeError('Index out of range');
}
function writeFloat(buf, value, offset, littleEndian, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
        checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
    }
    // @ts-ignore
    ieee754.write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
}
Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert);
};
Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert);
};
function writeDouble(buf, value, offset, littleEndian, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
        checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308);
    }
    // @ts-ignore
    ieee754.write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
}
Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert);
};
Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert);
};
// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy(target, targetStart, start, end) {
    if (!Buffer.isBuffer(target))
        throw new TypeError('argument should be a Buffer');
    if (!start)
        start = 0;
    if (!end && end !== 0)
        end = this.length;
    if (targetStart >= target.length)
        targetStart = target.length;
    if (!targetStart)
        targetStart = 0;
    if (end > 0 && end < start)
        end = start;
    // Copy 0 bytes; we're done
    if (end === start)
        return 0;
    if (target.length === 0 || this.length === 0)
        return 0;
    // Fatal error conditions
    if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds');
    }
    if (start < 0 || start >= this.length)
        throw new RangeError('Index out of range');
    if (end < 0)
        throw new RangeError('sourceEnd out of bounds');
    // Are we oob?
    if (end > this.length)
        end = this.length;
    if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
    }
    var len = end - start;
    if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
        // Use built-in when available, missing from IE11
        this.copyWithin(targetStart, start, end);
    }
    else if (this === target && start < targetStart && targetStart < end) {
        // descending copy from end
        for (var i = len - 1; i >= 0; --i) {
            target[i + targetStart] = this[i + start];
        }
    }
    else {
        Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
    }
    return len;
};
// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill(val, start, end, encoding) {
    // Handle string cases:
    if (typeof val === 'string') {
        if (typeof start === 'string') {
            encoding = start;
            start = 0;
            end = this.length;
        }
        else if (typeof end === 'string') {
            encoding = end;
            end = this.length;
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
            throw new TypeError('encoding must be a string');
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
            throw new TypeError('Unknown encoding: ' + encoding);
        }
        if (val.length === 1) {
            var code = val.charCodeAt(0);
            if ((encoding === 'utf8' && code < 128) ||
                encoding === 'latin1') {
                // Fast path: If `val` fits into a single byte, use that numeric value.
                val = code;
            }
        }
    }
    else if (typeof val === 'number') {
        val = val & 255;
    }
    // Invalid ranges are not set to a default, so can range check early.
    if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index');
    }
    if (end <= start) {
        return this;
    }
    start = start >>> 0;
    end = end === undefined ? this.length : end >>> 0;
    if (!val)
        val = 0;
    var i;
    if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
            this[i] = val;
        }
    }
    else {
        var bytes = Buffer.isBuffer(val)
            ? val
            // @ts-ignore
            : Buffer.from(val, encoding);
        var len = bytes.length;
        if (len === 0) {
            throw new TypeError('The value "' + val +
                '" is invalid for argument "value"');
        }
        for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len];
        }
    }
    return this;
};
// HELPER FUNCTIONS
// ================
var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
function base64clean(str) {
    // Node takes equal signs as end of the Base64 encoding
    str = str.split('=')[0];
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = str.trim().replace(INVALID_BASE64_RE, '');
    // Node converts strings with length < 2 to ''
    if (str.length < 2)
        return '';
    // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
    while (str.length % 4 !== 0) {
        str = str + '=';
    }
    return str;
}
function toHex(n) {
    if (n < 16)
        return '0' + n.toString(16);
    return n.toString(16);
}
function utf8ToBytes(string, units) {
    units = units || Infinity;
    var codePoint;
    var length = string.length;
    var leadSurrogate = null;
    var bytes = [];
    for (var i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);
        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
            // last char was a lead
            if (!leadSurrogate) {
                // no lead yet
                if (codePoint > 0xDBFF) {
                    // unexpected trail
                    if ((units -= 3) > -1)
                        bytes.push(0xEF, 0xBF, 0xBD);
                    continue;
                }
                else if (i + 1 === length) {
                    // unpaired lead
                    if ((units -= 3) > -1)
                        bytes.push(0xEF, 0xBF, 0xBD);
                    continue;
                }
                // valid lead
                leadSurrogate = codePoint;
                continue;
            }
            // 2 leads in a row
            if (codePoint < 0xDC00) {
                if ((units -= 3) > -1)
                    bytes.push(0xEF, 0xBF, 0xBD);
                leadSurrogate = codePoint;
                continue;
            }
            // valid surrogate pair
            codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        }
        else if (leadSurrogate) {
            // valid bmp char, but last char was a lead
            if ((units -= 3) > -1)
                bytes.push(0xEF, 0xBF, 0xBD);
        }
        leadSurrogate = null;
        // encode utf8
        if (codePoint < 0x80) {
            if ((units -= 1) < 0)
                break;
            bytes.push(codePoint);
        }
        else if (codePoint < 0x800) {
            if ((units -= 2) < 0)
                break;
            bytes.push(codePoint >> 0x6 | 0xC0, codePoint & 0x3F | 0x80);
        }
        else if (codePoint < 0x10000) {
            if ((units -= 3) < 0)
                break;
            bytes.push(codePoint >> 0xC | 0xE0, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
        }
        else if (codePoint < 0x110000) {
            if ((units -= 4) < 0)
                break;
            bytes.push(codePoint >> 0x12 | 0xF0, codePoint >> 0xC & 0x3F | 0x80, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
        }
        else {
            throw new Error('Invalid code point');
        }
    }
    return bytes;
}
function asciiToBytes(str) {
    var byteArray = [];
    for (var i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF);
    }
    return byteArray;
}
function utf16leToBytes(str, units) {
    var c, hi, lo;
    var byteArray = [];
    for (var i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0)
            break;
        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
    }
    return byteArray;
}
function base64ToBytes(str) {
    // @ts-ignore
    return base64.toByteArray(base64clean(str));
}
function blitBuffer(src, dst, offset, length) {
    for (var i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length))
            break;
        dst[i + offset] = src[i];
    }
    return i;
}
// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance(obj, type) {
    return obj instanceof type ||
        (obj != null && obj.constructor != null && obj.constructor.name != null &&
            obj.constructor.name === type.name);
}
function numberIsNaN(obj) {
    // For IE11 support
    return obj !== obj; // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)

},{"base64-js":1,"buffer":2,"ieee754":3}],10:[function(require,module,exports){
"use strict";
// https://gist.github.com/mudge/5830382#gistcomment-2658721
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
var EventEmitter = /** @class */ (function () {
    function EventEmitter() {
        this.events = {};
    }
    EventEmitter.prototype.on = function (event, listener) {
        var _this = this;
        if (typeof this.events[event] !== 'object') {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return function () { return _this.removeListener(event, listener); };
    };
    EventEmitter.prototype.removeListener = function (event, listener) {
        if (typeof this.events[event] !== 'object') {
            return;
        }
        var idx = this.events[event].indexOf(listener);
        if (idx > -1) {
            this.events[event].splice(idx, 1);
        }
    };
    EventEmitter.prototype.removeAllListeners = function () {
        var _this = this;
        Object.keys(this.events).forEach(function (event) { return _this.events[event].splice(0, _this.events[event].length); });
    };
    EventEmitter.prototype.emit = function (event) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (typeof this.events[event] !== 'object') {
            return;
        }
        __spreadArrays(this.events[event]).forEach(function (listener) { return listener.apply(_this, args); });
    };
    EventEmitter.prototype.once = function (event, listener) {
        var _this = this;
        var remove = this.on(event, function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            remove();
            listener.apply(_this, args);
        });
        return remove;
    };
    return EventEmitter;
}());
exports.EventEmitter = EventEmitter;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hub = void 0;
var eventEmitter_1 = require("../helpers/eventEmitter");
var buffer_1 = require("../helpers/buffer");
var Hub = /** @class */ (function () {
    function Hub(bluetooth) {
        this.emitter = new eventEmitter_1.EventEmitter();
        this.autoSubscribe = true;
        this.writeCue = [];
        this.isWriting = false;
        this.bluetooth = bluetooth;
        this.log = console.log;
        this.autoSubscribe = true;
        this.ports = {};
        this.num2type = {
            23: 'LED',
            37: 'DISTANCE',
            38: 'IMOTOR',
            39: 'MOTOR',
            40: 'TILT',
        };
        this.port2num = {
            A: 0x00,
            B: 0x01,
            C: 0x02,
            D: 0x03,
            AB: 0x10,
            LED: 0x32,
            TILT: 0x3a,
        };
        this.num2port = Object.entries(this.port2num).reduce(function (acc, _a) {
            var port = _a[0], portNum = _a[1];
            acc[portNum] = port;
            return acc;
        }, {});
        this.num2action = {
            1: 'start',
            5: 'conflict',
            10: 'stop',
        };
        this.num2color = {
            0: 'black',
            3: 'blue',
            5: 'green',
            7: 'yellow',
            9: 'red',
            10: 'white',
        };
        this.ledColors = [
            'off',
            'pink',
            'purple',
            'blue',
            'lightblue',
            'cyan',
            'green',
            'yellow',
            'orange',
            'red',
            'white',
        ];
        this.addListeners();
    }
    Hub.prototype.emit = function (type, data) {
        if (data === void 0) { data = null; }
        this.emitter.emit(type, data);
    };
    Hub.prototype.addListeners = function () {
        var _this = this;
        this.bluetooth.addEventListener('characteristicvaluechanged', function (event) {
            // https://googlechrome.github.io/samples/web-bluetooth/read-characteristic-value-changed.html
            // @ts-ignore
            var data = buffer_1.Buffer.from(event.target.value.buffer);
            _this.parseMessage(data);
        });
        setTimeout(function () {
            // Without timout missed first characteristicvaluechanged events
            _this.bluetooth.startNotifications();
        }, 1000);
    };
    Hub.prototype.parseMessage = function (data) {
        var _this = this;
        switch (data[2]) {
            case 0x04: {
                clearTimeout(this.portInfoTimeout);
                this.portInfoTimeout = setTimeout(function () {
                    /**
                     * Fires when a connection to the Move Hub is established
                     * @event Hub#connect
                     */
                    if (_this.autoSubscribe) {
                        _this.subscribeAll();
                    }
                    if (!_this.connected) {
                        _this.connected = true;
                        _this.emit('connect');
                    }
                }, 1000);
                this.log('Found: ' + this.num2type[data[5]]);
                this.logDebug('Found', data);
                if (data[4] === 0x01) {
                    this.ports[data[3]] = {
                        type: 'port',
                        deviceType: this.num2type[data[5]],
                        deviceTypeNum: data[5],
                    };
                }
                else if (data[4] === 0x02) {
                    this.ports[data[3]] = {
                        type: 'group',
                        deviceType: this.num2type[data[5]],
                        deviceTypeNum: data[5],
                        members: [data[7], data[8]],
                    };
                }
                break;
            }
            case 0x05: {
                this.log('Malformed message');
                this.log('<', data);
                break;
            }
            case 0x45: {
                this.parseSensor(data);
                break;
            }
            case 0x47: {
                // 0x47 subscription acknowledgements
                // https://github.com/JorgePe/BOOSTreveng/blob/master/Notifications.md
                break;
            }
            case 0x82: {
                /**
                 * Fires on port changes
                 * @event Hub#port
                 * @param port {object}
                 * @param port.port {string}
                 * @param port.action {string}
                 */
                this.emit('port', {
                    port: this.num2port[data[3]],
                    action: this.num2action[data[4]],
                });
                break;
            }
            default:
                this.log('unknown message type 0x' + data[2].toString(16));
                this.log('<', data);
        }
    };
    Hub.prototype.parseSensor = function (data) {
        if (!this.ports[data[3]]) {
            this.log('parseSensor unknown port 0x' + data[3].toString(16));
            return;
        }
        switch (this.ports[data[3]].deviceType) {
            case 'DISTANCE': {
                /**
                 * @event Hub#color
                 * @param color {string}
                 */
                this.emit('color', this.num2color[data[4]]);
                // TODO: improve distance calculation!
                var distance = void 0;
                if (data[7] > 0 && data[5] < 2) {
                    distance = Math.floor(20 - data[7] * 2.85);
                }
                else if (data[5] > 9) {
                    distance = Infinity;
                }
                else {
                    distance = Math.floor(20 + data[5] * 18);
                }
                /**
                 * @event Hub#distance
                 * @param distance {number} distance in millimeters
                 */
                this.emit('distance', distance);
                break;
            }
            case 'TILT': {
                var roll = data.readInt8(4);
                var pitch = data.readInt8(5);
                /**
                 * @event Hub#tilt
                 * @param tilt {object}
                 * @param tilt.roll {number}
                 * @param tilt.pitch {number}
                 */
                this.emit('tilt', { roll: roll, pitch: pitch });
                break;
            }
            case 'MOTOR':
            case 'IMOTOR': {
                var angle = data.readInt32LE(4);
                /**
                 * @event Hub#rotation
                 * @param rotation {object}
                 * @param rotation.port {string}
                 * @param rotation.angle
                 */
                this.emit('rotation', {
                    port: this.num2port[data[3]],
                    angle: angle,
                });
                break;
            }
            default:
                this.log('unknown sensor type 0x' + data[3].toString(16), data[3], this.ports[data[3]].deviceType);
        }
    };
    /**
     * Set Move Hub as disconnected
     * @method Hub#setDisconnected
     */
    Hub.prototype.setDisconnected = function () {
        // TODO: Should get this from some notification?
        this.connected = false;
        this.noReconnect = true;
        this.writeCue = [];
    };
    /**
     * Run a motor for specific time
     * @param {string|number} port possible string values: `A`, `B`, `AB`, `C`, `D`.
     * @param {number} seconds
     * @param {number} [dutyCycle=100] motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {function} [callback]
     */
    Hub.prototype.motorTime = function (port, seconds, dutyCycle, callback) {
        if (typeof dutyCycle === 'function') {
            callback = dutyCycle;
            dutyCycle = 100;
        }
        var portNum = typeof port === 'string' ? this.port2num[port] : port;
        this.write(this.encodeMotorTime(portNum, seconds, dutyCycle), callback);
    };
    /**
     * Run both motors (A and B) for specific time
     * @param {number} seconds
     * @param {number} dutyCycleA motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {number} dutyCycleB motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {function} callback
     */
    Hub.prototype.motorTimeMulti = function (seconds, dutyCycleA, dutyCycleB, callback) {
        this.write(this.encodeMotorTimeMulti(this.port2num['AB'], seconds, dutyCycleA, dutyCycleB), callback);
    };
    /**
     * Turn a motor by specific angle
     * @param {string|number} port possible string values: `A`, `B`, `AB`, `C`, `D`.
     * @param {number} angle - degrees to turn from `0` to `2147483647`
     * @param {number} [dutyCycle=100] motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {function} [callback]
     */
    Hub.prototype.motorAngle = function (port, angle, dutyCycle, callback) {
        if (typeof dutyCycle === 'function') {
            callback = dutyCycle;
            dutyCycle = 100;
        }
        var portNum = typeof port === 'string' ? this.port2num[port] : port;
        this.write(this.encodeMotorAngle(portNum, angle, dutyCycle), callback);
    };
    /**
     * Turn both motors (A and B) by specific angle
     * @param {number} angle degrees to turn from `0` to `2147483647`
     * @param {number} dutyCycleA motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {number} dutyCycleB motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {function} callback
     */
    Hub.prototype.motorAngleMulti = function (angle, dutyCycleA, dutyCycleB, callback) {
        this.write(this.encodeMotorAngleMulti(this.port2num['AB'], angle, dutyCycleA, dutyCycleB), callback);
    };
    /**
     * Send raw data
     * @param {object} raw raw data
     * @param {function} callback
     */
    Hub.prototype.rawCommand = function (raw, callback) {
        // @ts-ignore
        var buf = buffer_1.Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        for (var idx in raw) {
            buf.writeIntLE(raw[idx], idx);
        }
        this.write(buf, callback);
    };
    Hub.prototype.motorPowerCommand = function (port, power) {
        this.write(this.encodeMotorPower(port, power));
    };
    //[0x09, 0x00, 0x81, 0x39, 0x11, 0x07, 0x00, 0x64, 0x03]
    Hub.prototype.encodeMotorPower = function (port, dutyCycle) {
        if (dutyCycle === void 0) { dutyCycle = 100; }
        var portNum = typeof port === 'string' ? this.port2num[port] : port;
        // @ts-ignore
        var buf = buffer_1.Buffer.from([0x09, 0x00, 0x81, portNum, 0x11, 0x07, 0x00, 0x64, 0x03]);
        //buf.writeUInt16LE(seconds * 1000, 6);
        buf.writeInt8(dutyCycle, 6);
        return buf;
    };
    //0x0C, 0x00, 0x81, port, 0x11, 0x09, 0x00, 0x00, 0x00, 0x64, 0x7F, 0x03
    /**
     * Control the LED on the Move Hub
     * @method Hub#led
     * @param {boolean|number|string} color
     * If set to boolean `false` the LED is switched off, if set to `true` the LED will be white.
     * Possible string values: `off`, `pink`, `purple`, `blue`, `lightblue`, `cyan`, `green`, `yellow`, `orange`, `red`,
     * `white`
     * @param {function} [callback]
     */
    Hub.prototype.led = function (color, callback) {
        this.write(this.encodeLed(color), callback);
    };
    /**
     * Subscribe for sensor notifications
     * @param {string|number} port - e.g. call `.subscribe('C')` if you have your distance/color sensor on port C.
     * @param {number} [option=0] Unknown meaning. Needs to be 0 for distance/color, 2 for motors, 8 for tilt
     * @param {function} [callback]
     */
    Hub.prototype.subscribe = function (port, option, callback) {
        if (option === void 0) { option = 0; }
        if (typeof option === 'function') {
            // TODO: Why we have function check here?
            callback = option;
            option = 0x00;
        }
        var portNum = typeof port === 'string' ? this.port2num[port] : port;
        this.write(
        // @ts-ignore
        buffer_1.Buffer.from([0x0a, 0x00, 0x41, portNum, option, 0x01, 0x00, 0x00, 0x00, 0x01]), callback);
    };
    /**
     * Unsubscribe from sensor notifications
     * @param {string|number} port
     * @param {number} [option=0] Unknown meaning. Needs to be 0 for distance/color, 2 for motors, 8 for tilt
     * @param {function} [callback]
     */
    Hub.prototype.unsubscribe = function (port, option, callback) {
        if (option === void 0) { option = 0; }
        if (typeof option === 'function') {
            callback = option;
            option = 0x00;
        }
        var portNum = typeof port === 'string' ? this.port2num[port] : port;
        this.write(
        // @ts-ignore
        buffer_1.Buffer.from([0x0a, 0x00, 0x41, portNum, option, 0x01, 0x00, 0x00, 0x00, 0x00]), callback);
    };
    Hub.prototype.subscribeAll = function () {
        var _this = this;
        Object.entries(this.ports).forEach(function (_a) {
            var port = _a[0], data = _a[1];
            if (data.deviceType === 'DISTANCE') {
                _this.subscribe(parseInt(port, 10), 8);
            }
            else if (data.deviceType === 'TILT') {
                _this.subscribe(parseInt(port, 10), 0);
            }
            else if (data.deviceType === 'IMOTOR') {
                _this.subscribe(parseInt(port, 10), 2);
            }
            else if (data.deviceType === 'MOTOR') {
                _this.subscribe(parseInt(port, 10), 2);
            }
            else {
                _this.logDebug("Port subscribtion not sent: " + port);
            }
        });
    };
    /**
     * Send data over BLE
     * @method Hub#write
     * @param {string|Buffer} data If a string is given it has to have hex bytes separated by spaces, e.g. `0a 01 c3 b2`
     * @param {function} callback
     */
    Hub.prototype.write = function (data, callback) {
        if (typeof data === 'string') {
            var arr_1 = [];
            data.split(' ').forEach(function (c) {
                arr_1.push(parseInt(c, 16));
            });
            // @ts-ignore
            data = buffer_1.Buffer.from(arr_1);
        }
        // Original implementation passed secondArg to define if response is waited
        this.writeCue.push({
            data: data,
            secondArg: true,
            callback: callback,
        });
        this.writeFromCue();
    };
    Hub.prototype.writeFromCue = function () {
        var _this = this;
        if (this.writeCue.length === 0 || this.isWriting)
            return;
        var el = this.writeCue.shift();
        this.logDebug('Writing to device', el);
        this.isWriting = true;
        this.bluetooth
            .writeValue(el.data)
            .then(function () {
            _this.isWriting = false;
            if (typeof el.callback === 'function')
                el.callback();
        })
            .catch(function (err) {
            _this.isWriting = false;
            _this.log("Error while writing: " + el.data + " - Error " + err.toString());
            // TODO: Notify of failure
        })
            .finally(function () {
            _this.writeFromCue();
        });
    };
    Hub.prototype.encodeMotorTimeMulti = function (port, seconds, dutyCycleA, dutyCycleB) {
        if (dutyCycleA === void 0) { dutyCycleA = 100; }
        if (dutyCycleB === void 0) { dutyCycleB = -100; }
        // @ts-ignore
        var buf = buffer_1.Buffer.from([0x0d, 0x00, 0x81, port, 0x11, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x64, 0x7f, 0x03]);
        buf.writeUInt16LE(seconds * 1000, 6);
        buf.writeInt8(dutyCycleA, 8);
        buf.writeInt8(dutyCycleB, 9);
        return buf;
    };
    Hub.prototype.encodeMotorTime = function (port, seconds, dutyCycle) {
        if (dutyCycle === void 0) { dutyCycle = 100; }
        // @ts-ignore
        var buf = buffer_1.Buffer.from([0x0c, 0x00, 0x81, port, 0x11, 0x09, 0x00, 0x00, 0x00, 0x64, 0x7f, 0x03]);
        buf.writeUInt16LE(seconds * 1000, 6);
        buf.writeInt8(dutyCycle, 8);
        return buf;
    };
    Hub.prototype.encodeMotorAngleMulti = function (port, angle, dutyCycleA, dutyCycleB) {
        if (dutyCycleA === void 0) { dutyCycleA = 100; }
        if (dutyCycleB === void 0) { dutyCycleB = -100; }
        // @ts-ignore
        var buf = buffer_1.Buffer.from([0x0f, 0x00, 0x81, port, 0x11, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64, 0x7f, 0x03]);
        buf.writeUInt32LE(angle, 6);
        buf.writeInt8(dutyCycleA, 10);
        buf.writeInt8(dutyCycleB, 11);
        return buf;
    };
    Hub.prototype.encodeMotorAngle = function (port, angle, dutyCycle) {
        if (dutyCycle === void 0) { dutyCycle = 100; }
        // @ts-ignore
        var buf = buffer_1.Buffer.from([0x0e, 0x00, 0x81, port, 0x11, 0x0b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64, 0x7f, 0x03]);
        buf.writeUInt32LE(angle, 6);
        buf.writeInt8(dutyCycle, 10);
        return buf;
    };
    Hub.prototype.encodeLed = function (color) {
        if (typeof color === 'boolean') {
            color = color ? 'white' : 'off';
        }
        var colorNum = typeof color === 'string' ? this.ledColors.indexOf(color) : color;
        // @ts-ignore
        return buffer_1.Buffer.from([0x08, 0x00, 0x81, 0x32, 0x11, 0x51, 0x00, colorNum]);
    };
    return Hub;
}());
exports.Hub = Hub;

},{"../helpers/buffer":9,"../helpers/eventEmitter":10}],12:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubAsync = exports.DEFAULT_CONFIG = void 0;
var hub_1 = require("./hub");
var CALLBACK_TIMEOUT_MS = 1000 / 3;
exports.DEFAULT_CONFIG = {
    METRIC_MODIFIER: 28.5,
    TURN_MODIFIER: 2.56,
    DRIVE_SPEED: 25,
    TURN_SPEED: 20,
    DEFAULT_STOP_DISTANCE: 105,
    DEFAULT_CLEAR_DISTANCE: 120,
    LEFT_MOTOR: 'A',
    RIGHT_MOTOR: 'B',
    VALID_MOTORS: ['A', 'B'],
};
var validateConfiguration = function (configuration) {
    configuration.leftMotor = configuration.leftMotor || exports.DEFAULT_CONFIG.LEFT_MOTOR;
    configuration.rightMotor = configuration.rightMotor || exports.DEFAULT_CONFIG.RIGHT_MOTOR;
    // @ts-ignore
    if (!exports.DEFAULT_CONFIG.VALID_MOTORS.includes(configuration.leftMotor))
        throw Error('Define left port port correctly');
    // @ts-ignore
    if (!exports.DEFAULT_CONFIG.VALID_MOTORS.includes(configuration.rightMotor))
        throw Error('Define right port port correctly');
    if (configuration.leftMotor === configuration.rightMotor)
        throw Error('Left and right motor can not be same');
    configuration.distanceModifier = configuration.distanceModifier || exports.DEFAULT_CONFIG.METRIC_MODIFIER;
    configuration.turnModifier = configuration.turnModifier || exports.DEFAULT_CONFIG.TURN_MODIFIER;
    configuration.driveSpeed = configuration.driveSpeed || exports.DEFAULT_CONFIG.DRIVE_SPEED;
    configuration.turnSpeed = configuration.turnSpeed || exports.DEFAULT_CONFIG.TURN_SPEED;
    configuration.defaultStopDistance = configuration.defaultStopDistance || exports.DEFAULT_CONFIG.DEFAULT_STOP_DISTANCE;
    configuration.defaultClearDistance = configuration.defaultClearDistance || exports.DEFAULT_CONFIG.DEFAULT_CLEAR_DISTANCE;
};
var waitForValueToSet = function (valueName, compareFunc, timeoutMs) {
    var _this = this;
    if (compareFunc === void 0) { compareFunc = function (valueNameToCompare) { return _this[valueNameToCompare]; }; }
    if (timeoutMs === void 0) { timeoutMs = 0; }
    if (compareFunc.bind(this)(valueName))
        return Promise.resolve(this[valueName]);
    return new Promise(function (resolve, reject) {
        setTimeout(function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = resolve;
                    return [4 /*yield*/, waitForValueToSet.bind(this)(valueName, compareFunc, timeoutMs)];
                case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
            }
        }); }); }, timeoutMs + 100);
    });
};
var HubAsync = /** @class */ (function (_super) {
    __extends(HubAsync, _super);
    function HubAsync(bluetooth, configuration) {
        var _this = _super.call(this, bluetooth) || this;
        validateConfiguration(configuration);
        _this.configuration = configuration;
        return _this;
    }
    /**
     * Disconnect Hub
     * @method Hub#disconnectAsync
     * @returns {Promise<boolean>} disconnection successful
     */
    HubAsync.prototype.disconnectAsync = function () {
        this.setDisconnected();
        return waitForValueToSet.bind(this)('hubDisconnected');
    };
    /**
     * Execute this method after new instance of Hub is created
     * @method Hub#afterInitialization
     */
    HubAsync.prototype.afterInitialization = function () {
        var _this = this;
        this.hubDisconnected = null;
        this.portData = {
            A: { angle: 0 },
            B: { angle: 0 },
            AB: { angle: 0 },
            C: { angle: 0 },
            D: { angle: 0 },
            LED: { angle: 0 },
        };
        this.useMetric = true;
        this.modifier = 1;
        this.emitter.on('rotation', function (rotation) { return (_this.portData[rotation.port].angle = rotation.angle); });
        this.emitter.on('disconnect', function () { return (_this.hubDisconnected = true); });
        this.emitter.on('distance', function (distance) { return (_this.distance = distance); });
    };
    /**
     * Control the LED on the Move Hub
     * @method Hub#ledAsync
     * @param {boolean|number|string} color
     * If set to boolean `false` the LED is switched off, if set to `true` the LED will be white.
     * Possible string values: `off`, `pink`, `purple`, `blue`, `lightblue`, `cyan`, `green`, `yellow`, `orange`, `red`,
     * `white`
     * @returns {Promise}
     */
    HubAsync.prototype.ledAsync = function (color) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.led(color, function () {
                // Callback is executed when command is sent and it will take some time before MoveHub executes the command
                setTimeout(resolve, CALLBACK_TIMEOUT_MS);
            });
        });
    };
    /**
     * Run a motor for specific time
     * @method Hub#motorTimeAsync
     * @param {string|number} port possible string values: `A`, `B`, `AB`, `C`, `D`.
     * @param {number} seconds
     * @param {number} [dutyCycle=100] motor power percentsage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {boolean} [wait=false] will promise wait unitll motorTime run time has elapsed
     * @returns {Promise}
     */
    HubAsync.prototype.motorTimeAsync = function (port, seconds, dutyCycle, wait) {
        var _this = this;
        if (dutyCycle === void 0) { dutyCycle = 100; }
        if (wait === void 0) { wait = false; }
        return new Promise(function (resolve, _) {
            _this.motorTime(port, seconds, dutyCycle, function () {
                setTimeout(resolve, wait ? CALLBACK_TIMEOUT_MS + seconds * 1000 : CALLBACK_TIMEOUT_MS);
            });
        });
    };
    /**
     * Run both motors (A and B) for specific time
     * @method Hub#motorTimeMultiAsync
     * @param {number} seconds
     * @param {number} [dutyCycleA=100] motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {number} [dutyCycleB=100] motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {boolean} [wait=false] will promise wait unitll motorTime run time has elapsed
     * @returns {Promise}
     */
    HubAsync.prototype.motorTimeMultiAsync = function (seconds, dutyCycleA, dutyCycleB, wait) {
        var _this = this;
        if (dutyCycleA === void 0) { dutyCycleA = 100; }
        if (dutyCycleB === void 0) { dutyCycleB = 100; }
        if (wait === void 0) { wait = false; }
        return new Promise(function (resolve, _) {
            _this.motorTimeMulti(seconds, dutyCycleA, dutyCycleB, function () {
                setTimeout(resolve, wait ? CALLBACK_TIMEOUT_MS + seconds * 1000 : CALLBACK_TIMEOUT_MS);
            });
        });
    };
    /**
     * Turn a motor by specific angle
     * @method Hub#motorAngleAsync
     * @param {string|number} port possible string values: `A`, `B`, `AB`, `C`, `D`.
     * @param {number} angle - degrees to turn from `0` to `2147483647`
     * @param {number} [dutyCycle=100] motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {boolean} [wait=false] will promise wait unitll motorAngle has turned
     * @returns {Promise}
     */
    HubAsync.prototype.motorAngleAsync = function (port, angle, dutyCycle, wait) {
        var _this = this;
        if (dutyCycle === void 0) { dutyCycle = 100; }
        if (wait === void 0) { wait = false; }
        return new Promise(function (resolve, _) {
            _this.motorAngle(port, angle, dutyCycle, function () { return __awaiter(_this, void 0, void 0, function () {
                var beforeTurn;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!wait) return [3 /*break*/, 5];
                            beforeTurn = void 0;
                            _a.label = 1;
                        case 1:
                            beforeTurn = this.portData[port].angle;
                            return [4 /*yield*/, new Promise(function (res) { return setTimeout(res, CALLBACK_TIMEOUT_MS); })];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            if (this.portData[port].angle !== beforeTurn) return [3 /*break*/, 1];
                            _a.label = 4;
                        case 4:
                            resolve();
                            return [3 /*break*/, 6];
                        case 5:
                            setTimeout(resolve, CALLBACK_TIMEOUT_MS);
                            _a.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
        });
    };
    /**
     * Turn both motors (A and B) by specific angle
     * @method Hub#motorAngleMultiAsync
     * @param {number} angle degrees to turn from `0` to `2147483647`
     * @param {number} [dutyCycleA=100] motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {number} [dutyCycleB=100] motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {boolean} [wait=false] will promise wait unitll motorAngle has turned
     * @returns {Promise}
     */
    HubAsync.prototype.motorAngleMultiAsync = function (angle, dutyCycleA, dutyCycleB, wait) {
        var _this = this;
        if (dutyCycleA === void 0) { dutyCycleA = 100; }
        if (dutyCycleB === void 0) { dutyCycleB = 100; }
        if (wait === void 0) { wait = false; }
        return new Promise(function (resolve, _) {
            _this.motorAngleMulti(angle, dutyCycleA, dutyCycleB, function () { return __awaiter(_this, void 0, void 0, function () {
                var beforeTurn;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!wait) return [3 /*break*/, 5];
                            beforeTurn = void 0;
                            _a.label = 1;
                        case 1:
                            beforeTurn = this.portData['A'].angle;
                            return [4 /*yield*/, new Promise(function (res) { return setTimeout(res, CALLBACK_TIMEOUT_MS); })];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            if (this.portData['A'].angle !== beforeTurn) return [3 /*break*/, 1];
                            _a.label = 4;
                        case 4:
                            resolve();
                            return [3 /*break*/, 6];
                        case 5:
                            setTimeout(resolve, CALLBACK_TIMEOUT_MS);
                            _a.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
        });
    };
    /**
     * Use metric units (default)
     * @method Hub#useMetricUnits
     */
    HubAsync.prototype.useMetricUnits = function () {
        this.useMetric = true;
    };
    /**
     * Use imperial units
     * @method Hub#useImperialUnits
     */
    HubAsync.prototype.useImperialUnits = function () {
        this.useMetric = false;
    };
    /**
     * Set friction modifier
     * @method Hub#setFrictionModifier
     * @param {number} modifier friction modifier
     */
    HubAsync.prototype.setFrictionModifier = function (modifier) {
        this.modifier = modifier;
    };
    /**
     * Drive specified distance
     * @method Hub#drive
     * @param {number} distance distance in centimeters (default) or inches. Positive is forward and negative is backward.
     * @param {boolean} [wait=true] will promise wait untill the drive has completed.
     * @returns {Promise}
     */
    HubAsync.prototype.drive = function (distance, wait) {
        if (wait === void 0) { wait = true; }
        var angle = Math.abs(distance) *
            ((this.useMetric ? this.configuration.distanceModifier : this.configuration.distanceModifier / 4) *
                this.modifier);
        var dutyCycleA = this.configuration.driveSpeed * (distance > 0 ? 1 : -1) * (this.configuration.leftMotor === 'A' ? 1 : -1);
        var dutyCycleB = this.configuration.driveSpeed * (distance > 0 ? 1 : -1) * (this.configuration.leftMotor === 'A' ? 1 : -1);
        return this.motorAngleMultiAsync(angle, dutyCycleA, dutyCycleB, wait);
    };
    /**
     * Turn robot specified degrees
     * @method Hub#turn
     * @param {number} degrees degrees to3. Negative is to the left and positive to the right.
     * @param {boolean} [wait=true] will promise wait untill the turn has completed.
     * @returns {Promise}
     */
    HubAsync.prototype.turn = function (degrees, wait) {
        if (wait === void 0) { wait = true; }
        var angle = Math.abs(degrees) * this.configuration.turnModifier;
        var turnMotorModifier = this.configuration.leftMotor === 'A' ? 1 : -1;
        var leftTurn = this.configuration.turnSpeed * (degrees > 0 ? 1 : -1) * turnMotorModifier;
        var rightTurn = this.configuration.turnSpeed * (degrees > 0 ? -1 : 1) * turnMotorModifier;
        var dutyCycleA = this.configuration.leftMotor === 'A' ? leftTurn : rightTurn;
        var dutyCycleB = this.configuration.leftMotor === 'A' ? rightTurn : leftTurn;
        return this.motorAngleMultiAsync(angle, dutyCycleA, dutyCycleB, wait);
    };
    /**
     * Drive untill sensor shows object in defined distance
     * @method Hub#driveUntil
     * @param {number} [distance=0] distance in centimeters (default) or inches when to stop. Distance sensor is not very sensitive or accurate.
     * By default will stop when sensor notices wall for the first time. Sensor distance values are usualy between 110-50.
     * @param {boolean} [wait=true] will promise wait untill the bot will stop.
     * @returns {Promise}
     */
    HubAsync.prototype.driveUntil = function (distance, wait) {
        if (distance === void 0) { distance = 0; }
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            var distanceCheck, direction, compareFunc;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        distanceCheck = distance !== 0 ? (this.useMetric ? distance : distance * 2.54) : this.configuration.defaultStopDistance;
                        direction = this.configuration.leftMotor === 'A' ? 1 : -1;
                        compareFunc = direction === 1 ? function () { return distanceCheck >= _this.distance; } : function () { return distanceCheck <= _this.distance; };
                        this.motorTimeMulti(60, this.configuration.driveSpeed * direction, this.configuration.driveSpeed * direction);
                        if (!wait) return [3 /*break*/, 3];
                        return [4 /*yield*/, waitForValueToSet.bind(this)('distance', compareFunc)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.motorAngleMultiAsync(0)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3: return [2 /*return*/, waitForValueToSet
                            .bind(this)('distance', compareFunc)
                            .then(function (_) { return _this.motorAngleMulti(0, 0, 0); })];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Turn until there is no object in sensors sight
     * @method Hub#turnUntil
     * @param {number} [direction=1] direction to turn to. 1 (or any positive) is to the right and 0 (or any negative) is to the left.
     * @param {boolean} [wait=true] will promise wait untill the bot will stop.
     * @returns {Promise}
     */
    HubAsync.prototype.turnUntil = function (direction, wait) {
        if (direction === void 0) { direction = 1; }
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            var directionModifier;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        directionModifier = direction > 0 ? 1 : -1;
                        this.turn(360 * directionModifier, false);
                        if (!wait) return [3 /*break*/, 3];
                        return [4 /*yield*/, waitForValueToSet.bind(this)('distance', function () { return _this.distance >= _this.configuration.defaultClearDistance; })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.turn(0, false)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3: return [2 /*return*/, waitForValueToSet
                            .bind(this)('distance', function () { return _this.distance >= _this.configuration.defaultClearDistance; })
                            .then(function (_) { return _this.turn(0, false); })];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    HubAsync.prototype.updateConfiguration = function (configuration) {
        validateConfiguration(configuration);
        this.configuration = configuration;
    };
    return HubAsync;
}(hub_1.Hub));
exports.HubAsync = HubAsync;

},{"./hub":11}],13:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var boostConnector_1 = require("./boostConnector");
var hubAsync_1 = require("./hub/hubAsync");
var hub_control_1 = require("./ai/hub-control");
var LegoBoost = /** @class */ (function () {
    function LegoBoost() {
        this.logDebug = function (s) { };
        /**
         * Information from Lego Boost motors and sensors
         * @property LegoBoost#deviceInfo
         */
        this.deviceInfo = {
            ports: {
                A: { action: '', angle: 0 },
                B: { action: '', angle: 0 },
                AB: { action: '', angle: 0 },
                C: { action: '', angle: 0 },
                D: { action: '', angle: 0 },
                LED: { action: '', angle: 0 },
            },
            tilt: { roll: 0, pitch: 0 },
            distance: Number.MAX_SAFE_INTEGER,
            rssi: 0,
            color: '',
            error: '',
            connected: false,
        };
        /**
         * Input data to used on manual and AI control
         * @property LegoBoost#controlData
         */
        this.controlData = {
            input: null,
            speed: 0,
            turnAngle: 0,
            tilt: { roll: 0, pitch: 0 },
            forceState: null,
            updateInputMode: null,
            controlUpdateTime: undefined,
            state: undefined,
        };
    }
    /**
     * Drive forward until wall is reaced or drive backwards 100meters
     * @method LegoBoost#connect
     * @param {BoostConfiguration} [configuration={}] Lego boost motor and control configuration
     * @returns {Promise}
     */
    LegoBoost.prototype.connect = function (configuration) {
        if (configuration === void 0) { configuration = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var bluetooth, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        this.configuration = configuration;
                        return [4 /*yield*/, boostConnector_1.BoostConnector.connect(this.handleGattDisconnect.bind(this))];
                    case 1:
                        bluetooth = _a.sent();
                        this.initHub(bluetooth, this.configuration);
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        console.log('Error from connect: ' + e_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    LegoBoost.prototype.initHub = function (bluetooth, configuration) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.hub = new hubAsync_1.HubAsync(bluetooth, configuration);
                        this.hub.logDebug = this.logDebug;
                        this.hub.emitter.on('disconnect', function (evt) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        }); });
                        this.hub.emitter.on('connect', function (evt) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        this.hub.afterInitialization();
                                        return [4 /*yield*/, this.hub.ledAsync('white')];
                                    case 1:
                                        _a.sent();
                                        this.logDebug('Connected');
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.hubControl = new hub_control_1.HubControl(this.deviceInfo, this.controlData, configuration);
                        return [4 /*yield*/, this.hubControl.start(this.hub)];
                    case 1:
                        _a.sent();
                        this.updateTimer = setInterval(function () {
                            _this.hubControl.update();
                        }, 100);
                        return [2 /*return*/];
                }
            });
        });
    };
    LegoBoost.prototype.handleGattDisconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.logDebug('handleGattDisconnect');
                if (this.deviceInfo.connected === false)
                    return [2 /*return*/];
                this.hub.setDisconnected();
                this.deviceInfo.connected = false;
                clearInterval(this.updateTimer);
                this.logDebug('Disconnected');
                return [2 /*return*/];
            });
        });
    };
    /**
     * Change the color of the led between pink and orange
     * @method LegoBoost#changeLed
     * @returns {Promise}
     */
    LegoBoost.prototype.changeLed = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.hub || this.hub.connected === false)
                            return [2 /*return*/];
                        this.color = this.color === 'pink' ? 'orange' : 'pink';
                        return [4 /*yield*/, this.hub.ledAsync(this.color)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drive forward until wall is reaced or drive backwards 100meters
     * @method LegoBoost#driveToDirection
     * @param {number} [direction=1] Direction to drive. 1 or positive is forward, 0 or negative is backwards.
     * @returns {Promise}
     */
    LegoBoost.prototype.driveToDirection = function (direction) {
        if (direction === void 0) { direction = 1; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        if (!(direction > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.hub.driveUntil()];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, this.hub.drive(-10000)];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Disconnect Lego Boost
     * @method LegoBoost#disconnect
     * @returns {boolean|undefined}
     */
    LegoBoost.prototype.disconnect = function () {
        if (!this.hub || this.hub.connected === false)
            return;
        this.hub.setDisconnected();
        var success = boostConnector_1.BoostConnector.disconnect();
        return success;
    };
    /**
     * Start AI mode
     * @method LegoBoost#ai
     */
    LegoBoost.prototype.ai = function () {
        if (!this.hub || this.hub.connected === false)
            return;
        this.hubControl.setNextState('Drive');
    };
    /**
     * Stop engines A and B
     * @method LegoBoost#stop
     * @returns {Promise}
     */
    LegoBoost.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        this.controlData.speed = 0;
                        this.controlData.turnAngle = 0;
                        return [4 /*yield*/, this.hub.motorTimeMultiAsync(1, 0, 0)];
                    case 1: 
                    // control datas values might have always been 0, execute force stop
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Update Boost motor and control configuration
     * @method LegoBoost#updateConfiguration
     * @param {BoostConfiguration} configuration Boost motor and control configuration
     */
    LegoBoost.prototype.updateConfiguration = function (configuration) {
        if (!this.hub)
            return;
        this.hub.updateConfiguration(configuration);
        this.hubControl.updateConfiguration(configuration);
    };
    // Methods from Hub
    /**
     * Control the LED on the Move Hub
     * @method LegoBoost#led
     * @param {boolean|number|string} color
     * If set to boolean `false` the LED is switched off, if set to `true` the LED will be white.
     * Possible string values: `off`, `pink`, `purple`, `blue`, `lightblue`, `cyan`, `green`, `yellow`, `orange`, `red`,
     * `white`
     */
    LegoBoost.prototype.led = function (color) {
        if (!this.preCheck())
            return;
        this.hub.led(color);
    };
    /**
     * Control the LED on the Move Hub
     * @method LegoBoost#ledAsync
     * @param {boolean|number|string} color
     * If set to boolean `false` the LED is switched off, if set to `true` the LED will be white.
     * Possible string values: `off`, `pink`, `purple`, `blue`, `lightblue`, `cyan`, `green`, `yellow`, `orange`, `red`,
     * `white`
     * @returns {Promise}
     */
    LegoBoost.prototype.ledAsync = function (color) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.ledAsync(color)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Run a motor for specific time
     * @param {string|number} port possible string values: `A`, `B`, `AB`, `C`, `D`.
     * @param {number} seconds
     * @param {number} [dutyCycle=100] motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     */
    LegoBoost.prototype.motorTime = function (port, seconds, dutyCycle) {
        if (dutyCycle === void 0) { dutyCycle = 100; }
        if (!this.preCheck())
            return;
        this.hub.motorTime(port, seconds, dutyCycle);
    };
    /**
     * Run a motor for specific time
     * @method LegoBoost#motorTimeAsync
     * @param {string|number} port possible string values: `A`, `B`, `AB`, `C`, `D`.
     * @param {number} seconds
     * @param {number} [dutyCycle=100] motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {boolean} [wait=false] will promise wait unitll motorTime run time has elapsed
     * @returns {Promise}
     */
    LegoBoost.prototype.motorTimeAsync = function (port, seconds, dutyCycle, wait) {
        if (dutyCycle === void 0) { dutyCycle = 100; }
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.motorTimeAsync(port, seconds, dutyCycle, wait)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Run both motors (A and B) for specific time
     * @param {number} seconds
     * @param {number} dutyCycleA motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {number} dutyCycleB motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {function} callback
     */
    LegoBoost.prototype.motorTimeMulti = function (seconds, dutyCycleA, dutyCycleB) {
        if (dutyCycleA === void 0) { dutyCycleA = 100; }
        if (dutyCycleB === void 0) { dutyCycleB = 100; }
        if (!this.preCheck())
            return;
        this.hub.motorTimeMulti(seconds, dutyCycleA, dutyCycleB);
    };
    /**
     * Run both motors (A and B) for specific time
     * @method LegoBoost#motorTimeMultiAsync
     * @param {number} seconds
     * @param {number} [dutyCycleA=100] motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {number} [dutyCycleB=100] motor power percentage from `-100` to `100`. If a negative value is given rotation
     * is counterclockwise.
     * @param {boolean} [wait=false] will promise wait unitll motorTime run time has elapsed
     * @returns {Promise}
     */
    LegoBoost.prototype.motorTimeMultiAsync = function (seconds, dutyCycleA, dutyCycleB, wait) {
        if (dutyCycleA === void 0) { dutyCycleA = 100; }
        if (dutyCycleB === void 0) { dutyCycleB = 100; }
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.motorTimeMultiAsync(seconds, dutyCycleA, dutyCycleB, wait)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Turn a motor by specific angle
     * @param {string|number} port possible string values: `A`, `B`, `AB`, `C`, `D`.
     * @param {number} angle - degrees to turn from `0` to `2147483647`
     * @param {number} [dutyCycle=100] motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     */
    LegoBoost.prototype.motorAngle = function (port, angle, dutyCycle) {
        if (dutyCycle === void 0) { dutyCycle = 100; }
        if (!this.preCheck())
            return;
        this.hub.motorAngle(port, angle, dutyCycle);
    };
    /**
     * Turn a motor by specific angle
     * @method LegoBoost#motorAngleAsync
     * @param {string|number} port possible string values: `A`, `B`, `AB`, `C`, `D`.
     * @param {number} angle - degrees to turn from `0` to `2147483647`
     * @param {number} [dutyCycle=100] motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {boolean} [wait=false] will promise wait unitll motorAngle has turned
     * @returns {Promise}
     */
    LegoBoost.prototype.motorAngleAsync = function (port, angle, dutyCycle, wait) {
        if (dutyCycle === void 0) { dutyCycle = 100; }
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.motorAngleAsync(port, angle, dutyCycle, wait)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Turn both motors (A and B) by specific angle
     * @method LegoBoost#motorAngleMulti
     * @param {number} angle degrees to turn from `0` to `2147483647`
     * @param {number} dutyCycleA motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {number} dutyCycleB motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     */
    LegoBoost.prototype.motorAngleMulti = function (angle, dutyCycleA, dutyCycleB) {
        if (dutyCycleA === void 0) { dutyCycleA = 100; }
        if (dutyCycleB === void 0) { dutyCycleB = 100; }
        if (!this.preCheck())
            return;
        this.hub.motorAngleMulti(angle, dutyCycleA, dutyCycleB);
    };
    /**
     * Turn both motors (A and B) by specific angle
     * @method LegoBoost#motorAngleMultiAsync
     * @param {number} angle degrees to turn from `0` to `2147483647`
     * @param {number} [dutyCycleA=100] motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {number} [dutyCycleB=100] motor power percentage from `-100` to `100`. If a negative value is given
     * rotation is counterclockwise.
     * @param {boolean} [wait=false] will promise wait unitll motorAngle has turned
     * @returns {Promise}
     */
    LegoBoost.prototype.motorAngleMultiAsync = function (angle, dutyCycleA, dutyCycleB, wait) {
        if (dutyCycleA === void 0) { dutyCycleA = 100; }
        if (dutyCycleB === void 0) { dutyCycleB = 100; }
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.motorAngleMultiAsync(angle, dutyCycleA, dutyCycleB, wait)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drive specified distance
     * @method LegoBoost#drive
     * @param {number} distance distance in centimeters (default) or inches. Positive is forward and negative is backward.
     * @param {boolean} [wait=true] will promise wait untill the drive has completed.
     * @returns {Promise}
     */
    LegoBoost.prototype.drive = function (distance, wait) {
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.drive(distance, wait)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Turn robot specified degrees
     * @method LegoBoost#turn
     * @param {number} degrees degrees to turn. Negative is to the left and positive to the right.
     * @param {boolean} [wait=true] will promise wait untill the turn has completed.
     * @returns {Promise}
     */
    LegoBoost.prototype.turn = function (degrees, wait) {
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.turn(degrees, wait)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Drive untill sensor shows object in defined distance
     * @method LegoBoost#driveUntil
     * @param {number} [distance=0] distance in centimeters (default) or inches when to stop. Distance sensor is not very sensitive or accurate.
     * By default will stop when sensor notices wall for the first time. Sensor distance values are usualy between 110-50.
     * @param {boolean} [wait=true] will promise wait untill the bot will stop.
     * @returns {Promise}
     */
    LegoBoost.prototype.driveUntil = function (distance, wait) {
        if (distance === void 0) { distance = 0; }
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.driveUntil(distance, wait)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Turn until there is no object in sensors sight
     * @method LegoBoost#turnUntil
     * @param {number} [direction=1] direction to turn to. 1 (or any positive) is to the right and 0 (or any negative) is to the left.
     * @param {boolean} [wait=true] will promise wait untill the bot will stop.
     * @returns {Promise}
     */
    LegoBoost.prototype.turnUntil = function (direction, wait) {
        if (direction === void 0) { direction = 1; }
        if (wait === void 0) { wait = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.preCheck())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.hub.turnUntil(direction, wait)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Send raw data
     * @param {object} raw raw data
     */
    LegoBoost.prototype.rawCommand = function (raw) {
        if (!this.preCheck())
            return;
        return this.hub.rawCommand(raw);
    };
    LegoBoost.prototype.preCheck = function () {
        if (!this.hub || this.hub.connected === false)
            return false;
        this.hubControl.setNextState('Manual');
        return true;
    };
    return LegoBoost;
}());
exports.default = LegoBoost;

},{"./ai/hub-control":4,"./boostConnector":7,"./hub/hubAsync":12}]},{},[8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwic3JjL2FpL2h1Yi1jb250cm9sLnRzIiwic3JjL2FpL3N0YXRlcy9haS50cyIsInNyYy9haS9zdGF0ZXMvbWFudWFsLnRzIiwic3JjL2Jvb3N0Q29ubmVjdG9yLnRzIiwic3JjL2Jyb3dzZXIudHMiLCJzcmMvaGVscGVycy9idWZmZXIudHMiLCJzcmMvaGVscGVycy9ldmVudEVtaXR0ZXIudHMiLCJzcmMvaHViL2h1Yi50cyIsInNyYy9odWIvaHViQXN5bmMudHMiLCJzcmMvbGVnb0Jvb3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUMsQ0FBQyxDQUFBO0FBQ3pDLENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsV0FBVyxDQUFFLE1BQU0sRUFBRSxRQUFRO0lBQ25FLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQ3JCLElBQUksQ0FBQyxRQUFRO1FBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDaEQsT0FBTyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO0FBQ2hELENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsV0FBVyxDQUFFLE1BQU0sRUFBRSxRQUFRO0lBQ25FLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQ3JCLElBQUksQ0FBQyxRQUFRO1FBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDaEQsT0FBTyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO0FBQ2hELENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsV0FBVyxDQUFFLE1BQU0sRUFBRSxRQUFRO0lBQ25FLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQ3JCLElBQUksQ0FBQyxRQUFRO1FBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRWxELE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QixDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUM1QixDQUFDLENBQUE7QUFFRCxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxTQUFTLFdBQVcsQ0FBRSxNQUFNLEVBQUUsUUFBUTtJQUNuRSxNQUFNLEdBQUcsTUFBTSxLQUFLLENBQUMsQ0FBQTtJQUNyQixJQUFJLENBQUMsUUFBUTtRQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUVsRCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN6QixDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDdEIsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxXQUFXLENBQUUsTUFBTSxFQUFFLFFBQVE7SUFDbkUsTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLENBQUE7SUFDckIsSUFBSSxDQUFDLFFBQVE7UUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEQsYUFBYTtJQUNiLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDaEQsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxXQUFXLENBQUUsTUFBTSxFQUFFLFFBQVE7SUFDbkUsTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLENBQUE7SUFDckIsSUFBSSxDQUFDLFFBQVE7UUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEQsYUFBYTtJQUNiLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDakQsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsU0FBUyxZQUFZLENBQUUsTUFBTSxFQUFFLFFBQVE7SUFDckUsTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLENBQUE7SUFDckIsSUFBSSxDQUFDLFFBQVE7UUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEQsYUFBYTtJQUNiLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDaEQsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsU0FBUyxZQUFZLENBQUUsTUFBTSxFQUFFLFFBQVE7SUFDckUsTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLENBQUE7SUFDckIsSUFBSSxDQUFDLFFBQVE7UUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFD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QUFFLFVBQVUsRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7S0FDN0Q7SUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDVCxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDWCxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDWCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQTtJQUMzQixPQUFPLEVBQUUsQ0FBQyxHQUFHLFVBQVUsSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsRUFBRTtRQUN6QyxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDeEQsR0FBRyxHQUFHLENBQUMsQ0FBQTtTQUNSO1FBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUE7S0FDckQ7SUFFRCxPQUFPLE1BQU0sR0FBRyxVQUFVLENBQUE7QUFDNUIsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxVQUFVLENBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsUUFBUTtJQUNwRixLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUE7SUFDZCxNQUFNLEdBQUcsTUFBTSxLQUFLLENBQUMsQ0FBQTtJQUNyQixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFN0MsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7S0FDN0Q7SUFFRCxJQUFJLENBQUMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFBO0lBQ3RCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUNYLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQTtJQUMvQixPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsRUFBRTtRQUNqQyxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDeEQsR0FBRyxHQUFHLENBQUMsQ0FBQTtTQUNSO1FBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUE7S0FDckQ7SUFFRCxPQUFPLE1BQU0sR0FBRyxVQUFVLENBQUE7QUFDNUIsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxTQUFTLENBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRO0lBQ3RFLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQTtJQUNkLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQ3JCLElBQUksQ0FBQyxRQUFRO1FBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM1RCxJQUFJLEtBQUssR0FBRyxDQUFDO1FBQUUsS0FBSyxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFBO0lBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUM3QixPQUFPLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDbkIsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsU0FBUyxZQUFZLENBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRO0lBQzVFLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQTtJQUNkLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQ3JCLElBQUksQ0FBQyxRQUFRO1FBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUNoQyxPQUFPLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDbkIsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsU0FBUyxZQUFZLENBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRO0lBQzVFLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQTtJQUNkLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQ3JCLElBQUksQ0FBQyxRQUFRO1FBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUNq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QUMsUUFBUSxFQUFFO1lBQUUsT0FBTztRQUM3QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTyw0QkFBUSxHQUFoQjtRQUNFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxLQUFLLEtBQUs7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUM1RCxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDSCxnQkFBQztBQUFELENBcFpBLEFBb1pDLElBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG4vLyBTdXBwb3J0IGRlY29kaW5nIFVSTC1zYWZlIGJhc2U2NCBzdHJpbmdzLCBhcyBOb2RlLmpzIGRvZXMuXG4vLyBTZWU6IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Jhc2U2NCNVUkxfYXBwbGljYXRpb25zXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBnZXRMZW5zIChiNjQpIHtcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcblxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gVHJpbSBvZmYgZXh0cmEgYnl0ZXMgYWZ0ZXIgcGxhY2Vob2xkZXIgYnl0ZXMgYXJlIGZvdW5kXG4gIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2JlYXRnYW1taXQvYmFzZTY0LWpzL2lzc3Vlcy80MlxuICB2YXIgdmFsaWRMZW4gPSBiNjQuaW5kZXhPZignPScpXG4gIGlmICh2YWxpZExlbiA9PT0gLTEpIHZhbGlkTGVuID0gbGVuXG5cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IHZhbGlkTGVuID09PSBsZW5cbiAgICA/IDBcbiAgICA6IDQgLSAodmFsaWRMZW4gJSA0KVxuXG4gIHJldHVybiBbdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbl1cbn1cblxuLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgdmFyIGxlbnMgPSBnZXRMZW5zKGI2NClcbiAgdmFyIHZhbGlkTGVuID0gbGVuc1swXVxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gbGVuc1sxXVxuICByZXR1cm4gKCh2YWxpZExlbiArIHBsYWNlSG9sZGVyc0xlbikgKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnNMZW5cbn1cblxuZnVuY3Rpb24gX2J5dGVMZW5ndGggKGI2NCwgdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbikge1xuICByZXR1cm4gKCh2YWxpZExlbiArIHBsYWNlSG9sZGVyc0xlbikgKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnNMZW5cbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW5zID0gZ2V0TGVucyhiNjQpXG4gIHZhciB2YWxpZExlbiA9IGxlbnNbMF1cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IGxlbnNbMV1cblxuICB2YXIgYXJyID0gbmV3IEFycihfYnl0ZUxlbmd0aChiNjQsIHZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW4pKVxuXG4gIHZhciBjdXJCeXRlID0gMFxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgdmFyIGxlbiA9IHBsYWNlSG9sZGVyc0xlbiA+IDBcbiAgICA/IHZhbGlkTGVuIC0gNFxuICAgIDogdmFsaWRMZW5cblxuICB2YXIgaVxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildIDw8IDYpIHxcbiAgICAgIHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAyKSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA+PiA0KVxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVyc0xlbiA9PT0gMSkge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA+PiAyKVxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcbiAgcmV0dXJuIGxvb2t1cFtudW0gPj4gMTggJiAweDNGXSArXG4gICAgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArXG4gICAgbG9va3VwW251bSAmIDB4M0ZdXG59XG5cbmZ1bmN0aW9uIGVuY29kZUNodW5rICh1aW50OCwgc3RhcnQsIGVuZCkge1xuICB2YXIgdG1wXG4gIHZhciBvdXRwdXQgPSBbXVxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgIHRtcCA9XG4gICAgICAoKHVpbnQ4W2ldIDw8IDE2KSAmIDB4RkYwMDAwKSArXG4gICAgICAoKHVpbnQ4W2kgKyAxXSA8PCA4KSAmIDB4RkYwMCkgK1xuICAgICAgKHVpbnQ4W2kgKyAyXSAmIDB4RkYpXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBtYXhDaHVua0xlbmd0aCA9IDE2MzgzIC8vIG11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gIC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbjIgPSBsZW4gLSBleHRyYUJ5dGVzOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgIHBhcnRzLnB1c2goZW5jb2RlQ2h1bmsodWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKSkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBwYXJ0cy5wdXNoKFxuICAgICAgbG9va3VwW3RtcCA+PiAyXSArXG4gICAgICBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdICtcbiAgICAgICc9PSdcbiAgICApXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArIHVpbnQ4W2xlbiAtIDFdXG4gICAgcGFydHMucHVzaChcbiAgICAgIGxvb2t1cFt0bXAgPj4gMTBdICtcbiAgICAgIGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl0gK1xuICAgICAgbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXSArXG4gICAgICAnPSdcbiAgICApXG4gIH1cblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG52YXIgS19NQVhfTEVOR1RIID0gMHg3ZmZmZmZmZlxuZXhwb3J0cy5rTWF4TGVuZ3RoID0gS19NQVhfTEVOR1RIXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFByaW50IHdhcm5pbmcgYW5kIHJlY29tbWVuZCB1c2luZyBgYnVmZmVyYCB2NC54IHdoaWNoIGhhcyBhbiBPYmplY3RcbiAqICAgICAgICAgICAgICAgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIFdlIHJlcG9ydCB0aGF0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGlmIHRoZSBhcmUgbm90IHN1YmNsYXNzYWJsZVxuICogdXNpbmcgX19wcm90b19fLiBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YFxuICogKFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4KS4gSUUgMTAgbGFja3Mgc3VwcG9ydFxuICogZm9yIF9fcHJvdG9fXyBhbmQgaGFzIGEgYnVnZ3kgdHlwZWQgYXJyYXkgaW1wbGVtZW50YXRpb24uXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5pZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb25zb2xlLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgJ1RoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAnICtcbiAgICAnYGJ1ZmZlcmAgdjUueC4gVXNlIGBidWZmZXJgIHY0LnggaWYgeW91IHJlcXVpcmUgb2xkIGJyb3dzZXIgc3VwcG9ydC4nXG4gIClcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICAvLyBDYW4gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWQ/XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHsgX19wcm90b19fOiBVaW50OEFycmF5LnByb3RvdHlwZSwgZm9vOiBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9IH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MlxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdwYXJlbnQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyXG4gIH1cbn0pXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCAnb2Zmc2V0Jywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHJldHVybiB0aGlzLmJ5dGVPZmZzZXRcbiAgfVxufSlcblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKGxlbmd0aCA+IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgbGVuZ3RoICsgJ1wiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcInNpemVcIicpXG4gIH1cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKGFyZylcbiAgfVxuICByZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAhPSBudWxsICYmXG4gICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgdmFsdWU6IG51bGwsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZVxuICB9KVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuZnVuY3Rpb24gZnJvbSAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh2YWx1ZSlcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgdGhyb3cgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICcgK1xuICAgICAgJ29yIEFycmF5LWxpa2UgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHZhbHVlKVxuICAgIClcbiAgfVxuXG4gIGlmIChpc0luc3RhbmNlKHZhbHVlLCBBcnJheUJ1ZmZlcikgfHxcbiAgICAgICh2YWx1ZSAmJiBpc0luc3RhbmNlKHZhbHVlLmJ1ZmZlciwgQXJyYXlCdWZmZXIpKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG9mIHR5cGUgbnVtYmVyLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICApXG4gIH1cblxuICB2YXIgdmFsdWVPZiA9IHZhbHVlLnZhbHVlT2YgJiYgdmFsdWUudmFsdWVPZigpXG4gIGlmICh2YWx1ZU9mICE9IG51bGwgJiYgdmFsdWVPZiAhPT0gdmFsdWUpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20odmFsdWVPZiwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgdmFyIGIgPSBmcm9tT2JqZWN0KHZhbHVlKVxuICBpZiAoYikgcmV0dXJuIGJcblxuICBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvUHJpbWl0aXZlICE9IG51bGwgJiZcbiAgICAgIHR5cGVvZiB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKFxuICAgICAgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSgnc3RyaW5nJyksIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aFxuICAgIClcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICcgK1xuICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIE5vdGU6IENoYW5nZSBwcm90b3R5cGUgKmFmdGVyKiBCdWZmZXIuZnJvbSBpcyBkZWZpbmVkIHRvIHdvcmthcm91bmQgQ2hyb21lIGJ1Zzpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvMTQ4XG5CdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG5CdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyJylcbiAgfSBlbHNlIGlmIChzaXplIDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgc2l6ZSArICdcIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gXCJzaXplXCInKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSBidWYud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICBidWZbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyIChhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcIm9mZnNldFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wibGVuZ3RoXCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIHZhciBidWZcbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hTihvYmoubGVuZ3RoKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgIH1cbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmopXG4gIH1cblxuICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIEFycmF5LmlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlICYmXG4gICAgYiAhPT0gQnVmZmVyLnByb3RvdHlwZSAvLyBzbyBCdWZmZXIuaXNCdWZmZXIoQnVmZmVyLnByb3RvdHlwZSkgd2lsbCBiZSBmYWxzZVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKGlzSW5zdGFuY2UoYSwgVWludDhBcnJheSkpIGEgPSBCdWZmZXIuZnJvbShhLCBhLm9mZnNldCwgYS5ieXRlTGVuZ3RoKVxuICBpZiAoaXNJbnN0YW5jZShiLCBVaW50OEFycmF5KSkgYiA9IEJ1ZmZlci5mcm9tKGIsIGIub2Zmc2V0LCBiLmJ5dGVMZW5ndGgpXG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcImJ1ZjFcIiwgXCJidWYyXCIgYXJndW1lbnRzIG11c3QgYmUgb25lIG9mIHR5cGUgQnVmZmVyIG9yIFVpbnQ4QXJyYXknXG4gICAgKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKGlzSW5zdGFuY2UoYnVmLCBVaW50OEFycmF5KSkge1xuICAgICAgYnVmID0gQnVmZmVyLmZyb20oYnVmKVxuICAgIH1cbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICAgIH1cbiAgICBidWYuY29weShidWZmZXIsIHBvcylcbiAgICBwb3MgKz0gYnVmLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZmZXJcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG4gIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc3RyaW5nKSB8fCBpc0luc3RhbmNlKHN0cmluZywgQXJyYXlCdWZmZXIpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBvciBBcnJheUJ1ZmZlci4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgdHlwZW9mIHN0cmluZ1xuICAgIClcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBtdXN0TWF0Y2ggPSAoYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdID09PSB0cnVlKVxuICBpZiAoIW11c3RNYXRjaCAmJiBsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHtcbiAgICAgICAgICByZXR1cm4gbXVzdE1hdGNoID8gLTEgOiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICB9XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nID0gQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZ1xuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLnJlcGxhY2UoLyguezJ9KS9nLCAnJDEgJykudHJpbSgpXG4gIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKGlzSW5zdGFuY2UodGFyZ2V0LCBVaW50OEFycmF5KSkge1xuICAgIHRhcmdldCA9IEJ1ZmZlci5mcm9tKHRhcmdldCwgdGFyZ2V0Lm9mZnNldCwgdGFyZ2V0LmJ5dGVMZW5ndGgpXG4gIH1cbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidGFyZ2V0XCIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheS4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB0YXJnZXQpXG4gICAgKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmICh0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbIHZhbCBdLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgaVxuICBpZiAoZGlyKSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIGZvdW5kSW5kZXggKiBpbmRleFNpemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGJ5dGVPZmZzZXQgKyB2YWxMZW5ndGggPiBhcnJMZW5ndGgpIGJ5dGVPZmZzZXQgPSBhcnJMZW5ndGggLSB2YWxMZW5ndGhcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZvdW5kID0gdHJ1ZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWxMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAocmVhZChhcnIsIGkgKyBqKSAhPT0gcmVhZCh2YWwsIGopKSB7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIHRydWUpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUubGFzdEluZGV4T2YgPSBmdW5jdGlvbiBsYXN0SW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAobnVtYmVySXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGxhdGluMVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggPj4+IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdCdWZmZXIud3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0WywgbGVuZ3RoXSkgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCdcbiAgICApXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGxhdGluMVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYnVmZmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpIC0gMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgc2hvdWxkIGJlIGEgQnVmZmVyJylcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgdHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmNvcHlXaXRoaW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBVc2UgYnVpbHQtaW4gd2hlbiBhdmFpbGFibGUsIG1pc3NpbmcgZnJvbSBJRTExXG4gICAgdGhpcy5jb3B5V2l0aGluKHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKVxuICB9IGVsc2UgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yICh2YXIgaSA9IGxlbiAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoKGVuY29kaW5nID09PSAndXRmOCcgJiYgY29kZSA8IDEyOCkgfHxcbiAgICAgICAgICBlbmNvZGluZyA9PT0gJ2xhdGluMScpIHtcbiAgICAgICAgLy8gRmFzdCBwYXRoOiBJZiBgdmFsYCBmaXRzIGludG8gYSBzaW5nbGUgYnl0ZSwgdXNlIHRoYXQgbnVtZXJpYyB2YWx1ZS5cbiAgICAgICAgdmFsID0gY29kZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDI1NVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICA6IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyB2YWwgK1xuICAgICAgICAnXCIgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgXCJ2YWx1ZVwiJylcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSB0YWtlcyBlcXVhbCBzaWducyBhcyBlbmQgb2YgdGhlIEJhc2U2NCBlbmNvZGluZ1xuICBzdHIgPSBzdHIuc3BsaXQoJz0nKVswXVxuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbi8vIEFycmF5QnVmZmVyIG9yIFVpbnQ4QXJyYXkgb2JqZWN0cyBmcm9tIG90aGVyIGNvbnRleHRzIChpLmUuIGlmcmFtZXMpIGRvIG5vdCBwYXNzXG4vLyB0aGUgYGluc3RhbmNlb2ZgIGNoZWNrIGJ1dCB0aGV5IHNob3VsZCBiZSB0cmVhdGVkIGFzIG9mIHRoYXQgdHlwZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE2NlxuZnVuY3Rpb24gaXNJbnN0YW5jZSAob2JqLCB0eXBlKSB7XG4gIHJldHVybiBvYmogaW5zdGFuY2VvZiB0eXBlIHx8XG4gICAgKG9iaiAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3RvciAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lICE9IG51bGwgJiZcbiAgICAgIG9iai5jb25zdHJ1Y3Rvci5uYW1lID09PSB0eXBlLm5hbWUpXG59XG5mdW5jdGlvbiBudW1iZXJJc05hTiAob2JqKSB7XG4gIC8vIEZvciBJRTExIHN1cHBvcnRcbiAgcmV0dXJuIG9iaiAhPT0gb2JqIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCIvKiEgaWVlZTc1NC4gQlNELTMtQ2xhdXNlIExpY2Vuc2UuIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZy9vcGVuc291cmNlPiAqL1xuZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSAoZSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSAobSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICgodmFsdWUgKiBjKSAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiaW1wb3J0IHsgbWFudWFsIH0gZnJvbSAnLi9zdGF0ZXMvbWFudWFsJztcbmltcG9ydCB7IHN0b3AsIGJhY2ssIGRyaXZlLCB0dXJuLCBzZWVrIH0gZnJvbSAnLi9zdGF0ZXMvYWknO1xuaW1wb3J0IHsgQm9vc3RDb25maWd1cmF0aW9uLCBIdWJBc3luYyB9IGZyb20gJy4uL2h1Yi9odWJBc3luYyc7XG5pbXBvcnQgeyBDb250cm9sRGF0YSwgRGV2aWNlSW5mbywgU3RhdGUgfSBmcm9tICcuLi90eXBlcyc7XG5cbnR5cGUgU3RhdGVzID0ge1xuICBba2V5IGluIFN0YXRlXTogKGh1YjogSHViQ29udHJvbCkgPT4gdm9pZDtcbn07XG5cbmNsYXNzIEh1YkNvbnRyb2wge1xuICBodWI6IEh1YkFzeW5jO1xuICBkZXZpY2U6IERldmljZUluZm87XG4gIHByZXZEZXZpY2U6IERldmljZUluZm87XG4gIGNvbnRyb2w6IENvbnRyb2xEYXRhO1xuICBwcmV2Q29udHJvbDogQ29udHJvbERhdGE7XG4gIGNvbmZpZ3VyYXRpb246IEJvb3N0Q29uZmlndXJhdGlvbjtcbiAgc3RhdGVzOiBTdGF0ZXM7XG4gIGN1cnJlbnRTdGF0ZTogKGh1YjogSHViQ29udHJvbCkgPT4gdm9pZDtcblxuICBjb25zdHJ1Y3RvcihkZXZpY2VJbmZvOiBEZXZpY2VJbmZvLCBjb250cm9sRGF0YTogQ29udHJvbERhdGEsIGNvbmZpZ3VyYXRpb246IEJvb3N0Q29uZmlndXJhdGlvbikge1xuICAgIHRoaXMuaHViID0gbnVsbDtcbiAgICB0aGlzLmRldmljZSA9IGRldmljZUluZm87XG4gICAgdGhpcy5jb250cm9sID0gY29udHJvbERhdGE7XG4gICAgdGhpcy5jb25maWd1cmF0aW9uID0gY29uZmlndXJhdGlvbjtcbiAgICB0aGlzLnByZXZDb250cm9sID0geyAuLi50aGlzLmNvbnRyb2wgfTtcblxuICAgIHRoaXMuc3RhdGVzID0ge1xuICAgICAgVHVybjogdHVybixcbiAgICAgIERyaXZlOiBkcml2ZSxcbiAgICAgIFN0b3A6IHN0b3AsXG4gICAgICBCYWNrOiBiYWNrLFxuICAgICAgTWFudWFsOiBtYW51YWwsXG4gICAgICBTZWVrOiBzZWVrLFxuICAgIH07XG5cbiAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMuc3RhdGVzWydNYW51YWwnXTtcbiAgfVxuXG4gIHVwZGF0ZUNvbmZpZ3VyYXRpb24oY29uZmlndXJhdGlvbjogQm9vc3RDb25maWd1cmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5jb25maWd1cmF0aW9uID0gY29uZmlndXJhdGlvbjtcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0KGh1YjogSHViQXN5bmMpIHtcbiAgICB0aGlzLmh1YiA9IGh1YjtcbiAgICB0aGlzLmRldmljZS5jb25uZWN0ZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5odWIuZW1pdHRlci5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgdGhpcy5kZXZpY2UuZXJyID0gZXJyO1xuICAgIH0pO1xuXG4gICAgdGhpcy5odWIuZW1pdHRlci5vbignZGlzY29ubmVjdCcsICgpID0+IHtcbiAgICAgIHRoaXMuZGV2aWNlLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIH0pO1xuXG4gICAgdGhpcy5odWIuZW1pdHRlci5vbignZGlzdGFuY2UnLCBkaXN0YW5jZSA9PiB7XG4gICAgICB0aGlzLmRldmljZS5kaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgIH0pO1xuXG4gICAgdGhpcy5odWIuZW1pdHRlci5vbigncnNzaScsIHJzc2kgPT4ge1xuICAgICAgdGhpcy5kZXZpY2UucnNzaSA9IHJzc2k7XG4gICAgfSk7XG5cbiAgICB0aGlzLmh1Yi5lbWl0dGVyLm9uKCdwb3J0JywgcG9ydE9iamVjdCA9PiB7XG4gICAgICBjb25zdCB7IHBvcnQsIGFjdGlvbiB9ID0gcG9ydE9iamVjdDtcbiAgICAgIHRoaXMuZGV2aWNlLnBvcnRzW3BvcnRdLmFjdGlvbiA9IGFjdGlvbjtcbiAgICB9KTtcblxuICAgIHRoaXMuaHViLmVtaXR0ZXIub24oJ2NvbG9yJywgY29sb3IgPT4ge1xuICAgICAgdGhpcy5kZXZpY2UuY29sb3IgPSBjb2xvcjtcbiAgICB9KTtcblxuICAgIHRoaXMuaHViLmVtaXR0ZXIub24oJ3RpbHQnLCB0aWx0ID0+IHtcbiAgICAgIGNvbnN0IHsgcm9sbCwgcGl0Y2ggfSA9IHRpbHQ7XG4gICAgICB0aGlzLmRldmljZS50aWx0LnJvbGwgPSByb2xsO1xuICAgICAgdGhpcy5kZXZpY2UudGlsdC5waXRjaCA9IHBpdGNoO1xuICAgIH0pO1xuXG4gICAgdGhpcy5odWIuZW1pdHRlci5vbigncm90YXRpb24nLCByb3RhdGlvbiA9PiB7XG4gICAgICBjb25zdCB7IHBvcnQsIGFuZ2xlIH0gPSByb3RhdGlvbjtcbiAgICAgIHRoaXMuZGV2aWNlLnBvcnRzW3BvcnRdLmFuZ2xlID0gYW5nbGU7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLmh1Yi5sZWRBc3luYygncmVkJyk7XG4gICAgYXdhaXQgdGhpcy5odWIubGVkQXN5bmMoJ3llbGxvdycpO1xuICAgIGF3YWl0IHRoaXMuaHViLmxlZEFzeW5jKCdncmVlbicpO1xuICB9XG5cbiAgYXN5bmMgZGlzY29ubmVjdCgpIHtcbiAgICBpZiAodGhpcy5kZXZpY2UuY29ubmVjdGVkKSB7XG4gICAgICBhd2FpdCB0aGlzLmh1Yi5kaXNjb25uZWN0QXN5bmMoKTtcbiAgICB9XG4gIH1cblxuICBzZXROZXh0U3RhdGUoc3RhdGU6IFN0YXRlKSB7XG4gICAgdGhpcy5jb250cm9sLmNvbnRyb2xVcGRhdGVUaW1lID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY29udHJvbC5zdGF0ZSA9IHN0YXRlO1xuICAgIHRoaXMuY3VycmVudFN0YXRlID0gdGhpcy5zdGF0ZXNbc3RhdGVdO1xuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIC8vIFRPRE86IEFmdGVyIHJlbW92aW5nIGJpbmQsIHRoaXMgcmVxdWlyZXMgc29tZSBtb3JlIHJlZmFjdG9yaW5nXG4gICAgdGhpcy5jdXJyZW50U3RhdGUodGhpcyk7XG5cbiAgICAvLyBUT0RPOiBEZWVwIGNsb25lXG4gICAgdGhpcy5wcmV2Q29udHJvbCA9IHsgLi4udGhpcy5jb250cm9sIH07XG4gICAgdGhpcy5wcmV2Q29udHJvbC50aWx0ID0geyAuLi50aGlzLmNvbnRyb2wudGlsdCB9O1xuICAgIHRoaXMucHJldkRldmljZSA9IHsgLi4udGhpcy5kZXZpY2UgfTtcbiAgfVxufVxuXG5leHBvcnQgeyBIdWJDb250cm9sIH07XG4iLCJpbXBvcnQgeyBIdWJDb250cm9sIH0gZnJvbSAnLi4vaHViLWNvbnRyb2wnO1xuXG5jb25zdCBNSU5fRElTVEFOQ0UgPSA3NTtcbmNvbnN0IE9LX0RJU1RBTkNFID0gMTAwO1xuXG5jb25zdCBFWEVDVVRFX1RJTUVfU0VDID0gNjA7XG5jb25zdCBDSEVDS19USU1FX01TID0gNTkwMDA7XG5cbi8vIFNwZWVkcyBtdXN0IGJlIGJldHdlZW4gLTEwMCBhbmQgMTAwXG5jb25zdCBUVVJOX1NQRUVEID0gMzA7XG5jb25zdCBUVVJOX1NQRUVEX09QUE9TSVRFID0gLTEwO1xuY29uc3QgRFJJVkVfU1BFRUQgPSAzMDtcbmNvbnN0IFJFVkVSU0VfU1BFRUQgPSAtMTU7XG5cbmNvbnN0IHNlZWsgPSAoaHViQ29udHJvbDogSHViQ29udHJvbCkgPT4ge1xuICBpZiAoIWh1YkNvbnRyb2wuY29udHJvbC5jb250cm9sVXBkYXRlVGltZSB8fCBEYXRlLm5vdygpIC0gaHViQ29udHJvbC5jb250cm9sLmNvbnRyb2xVcGRhdGVUaW1lID4gQ0hFQ0tfVElNRV9NUykge1xuICAgIGh1YkNvbnRyb2wuY29udHJvbC5jb250cm9sVXBkYXRlVGltZSA9IERhdGUubm93KCk7XG4gICAgaHViQ29udHJvbC5odWIubW90b3JUaW1lTXVsdGkoRVhFQ1VURV9USU1FX1NFQywgVFVSTl9TUEVFRCwgVFVSTl9TUEVFRF9PUFBPU0lURSk7XG4gIH1cblxuICBpZiAoRGF0ZS5ub3coKSAtIGh1YkNvbnRyb2wuY29udHJvbC5jb250cm9sVXBkYXRlVGltZSA8IDI1MCkgcmV0dXJuO1xuXG4gIGlmIChodWJDb250cm9sLmRldmljZS5kaXN0YW5jZSA+IGh1YkNvbnRyb2wucHJldkRldmljZS5kaXN0YW5jZSkge1xuICAgIGh1YkNvbnRyb2wuY29udHJvbC50dXJuRGlyZWN0aW9uID0gJ3JpZ2h0JztcbiAgICBodWJDb250cm9sLnNldE5leHRTdGF0ZSgnVHVybicpO1xuICB9IGVsc2Uge1xuICAgIGh1YkNvbnRyb2wuY29udHJvbC50dXJuRGlyZWN0aW9uID0gJ2xlZnQnO1xuICAgIGh1YkNvbnRyb2wuc2V0TmV4dFN0YXRlKCdUdXJuJyk7XG4gIH1cbn1cblxuY29uc3QgdHVybiA9IChodWJDb250cm9sOiBIdWJDb250cm9sKSA9PiB7XG4gIGlmIChodWJDb250cm9sLmRldmljZS5kaXN0YW5jZSA8IE1JTl9ESVNUQU5DRSkge1xuICAgIGh1YkNvbnRyb2wuY29udHJvbC50dXJuRGlyZWN0aW9uID0gbnVsbDtcbiAgICBodWJDb250cm9sLnNldE5leHRTdGF0ZSgnQmFjaycpO1xuICAgIHJldHVybjtcbiAgfSBlbHNlIGlmIChodWJDb250cm9sLmRldmljZS5kaXN0YW5jZSA+IE9LX0RJU1RBTkNFKSB7XG4gICAgaHViQ29udHJvbC5jb250cm9sLnR1cm5EaXJlY3Rpb24gPSBudWxsO1xuICAgIGh1YkNvbnRyb2wuc2V0TmV4dFN0YXRlKCdEcml2ZScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghaHViQ29udHJvbC5jb250cm9sLmNvbnRyb2xVcGRhdGVUaW1lIHx8IERhdGUubm93KCkgLSBodWJDb250cm9sLmNvbnRyb2wuY29udHJvbFVwZGF0ZVRpbWUgPiBDSEVDS19USU1FX01TKSB7XG4gICAgY29uc3QgbW90b3JBID0gaHViQ29udHJvbC5jb250cm9sLnR1cm5EaXJlY3Rpb24gPT09ICdyaWdodCcgPyBUVVJOX1NQRUVEIDogVFVSTl9TUEVFRF9PUFBPU0lURTtcbiAgICBjb25zdCBtb3RvckIgPSBodWJDb250cm9sLmNvbnRyb2wudHVybkRpcmVjdGlvbiA9PT0gJ3JpZ2h0JyA/IFRVUk5fU1BFRURfT1BQT1NJVEUgOiBUVVJOX1NQRUVEO1xuXG4gICAgaHViQ29udHJvbC5jb250cm9sLmNvbnRyb2xVcGRhdGVUaW1lID0gRGF0ZS5ub3coKTtcbiAgICBodWJDb250cm9sLmh1Yi5tb3RvclRpbWVNdWx0aShFWEVDVVRFX1RJTUVfU0VDLCBtb3RvckEsIG1vdG9yQik7XG4gIH1cbn1cblxuXG5jb25zdCBkcml2ZSA9IChodWJDb250cm9sOiBIdWJDb250cm9sKSA9PiB7XG4gIGlmIChodWJDb250cm9sLmRldmljZS5kaXN0YW5jZSA8IE1JTl9ESVNUQU5DRSkge1xuICAgIGh1YkNvbnRyb2wuc2V0TmV4dFN0YXRlKCdCYWNrJyk7XG4gICAgcmV0dXJuO1xuICB9IGVsc2UgaWYgKGh1YkNvbnRyb2wuZGV2aWNlLmRpc3RhbmNlIDwgT0tfRElTVEFOQ0UpIHtcbiAgICBodWJDb250cm9sLnNldE5leHRTdGF0ZSgnU2VlaycpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghaHViQ29udHJvbC5jb250cm9sLmNvbnRyb2xVcGRhdGVUaW1lIHx8IERhdGUubm93KCkgLSBodWJDb250cm9sLmNvbnRyb2wuY29udHJvbFVwZGF0ZVRpbWUgPiBDSEVDS19USU1FX01TKSB7XG4gICAgaHViQ29udHJvbC5jb250cm9sLmNvbnRyb2xVcGRhdGVUaW1lID0gRGF0ZS5ub3coKTtcbiAgICBjb25zdCBzcGVlZCA9IGh1YkNvbnRyb2wuY29uZmlndXJhdGlvbi5sZWZ0TW90b3IgPT09ICdBJyA/IERSSVZFX1NQRUVEIDogRFJJVkVfU1BFRUQgKiAtMTtcbiAgICBodWJDb250cm9sLmh1Yi5tb3RvclRpbWVNdWx0aShFWEVDVVRFX1RJTUVfU0VDLCBzcGVlZCwgc3BlZWQpO1xuICB9XG59XG5cbmNvbnN0IGJhY2sgPSAoaHViQ29udHJvbDogSHViQ29udHJvbCkgPT4ge1xuICBpZiAoaHViQ29udHJvbC5kZXZpY2UuZGlzdGFuY2UgPiBPS19ESVNUQU5DRSkge1xuICAgIGh1YkNvbnRyb2wuc2V0TmV4dFN0YXRlKCdTZWVrJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKCFodWJDb250cm9sLmNvbnRyb2wuY29udHJvbFVwZGF0ZVRpbWUgfHwgRGF0ZS5ub3coKSAtIGh1YkNvbnRyb2wuY29udHJvbC5jb250cm9sVXBkYXRlVGltZSA+IENIRUNLX1RJTUVfTVMpIHtcbiAgICBodWJDb250cm9sLmNvbnRyb2wuY29udHJvbFVwZGF0ZVRpbWUgPSBEYXRlLm5vdygpO1xuICAgIGNvbnN0IHNwZWVkID0gaHViQ29udHJvbC5jb25maWd1cmF0aW9uLmxlZnRNb3RvciA9PT0gJ0EnID8gUkVWRVJTRV9TUEVFRCA6IFJFVkVSU0VfU1BFRUQgKiAtMTtcbiAgICBodWJDb250cm9sLmh1Yi5tb3RvclRpbWVNdWx0aShFWEVDVVRFX1RJTUVfU0VDLCBzcGVlZCwgc3BlZWQpO1xuICB9XG59XG5cblxuY29uc3Qgc3RvcCA9IChodWJDb250cm9sOiBIdWJDb250cm9sKSA9PiB7XG4gIGh1YkNvbnRyb2wuY29udHJvbC5zcGVlZCA9IDA7XG4gIGh1YkNvbnRyb2wuY29udHJvbC50dXJuQW5nbGUgPSAwO1xuXG4gIGlmICghaHViQ29udHJvbC5jb250cm9sLmNvbnRyb2xVcGRhdGVUaW1lIHx8IERhdGUubm93KCkgLSBodWJDb250cm9sLmNvbnRyb2wuY29udHJvbFVwZGF0ZVRpbWUgPiBDSEVDS19USU1FX01TKSB7XG4gICAgaHViQ29udHJvbC5jb250cm9sLmNvbnRyb2xVcGRhdGVUaW1lID0gRGF0ZS5ub3coKTtcbiAgICBodWJDb250cm9sLmh1Yi5tb3RvclRpbWVNdWx0aShFWEVDVVRFX1RJTUVfU0VDLCAwLCAwKTtcbiAgfVxufVxuXG5leHBvcnQgeyBzdG9wLCBiYWNrLCBkcml2ZSwgdHVybiwgc2VlayB9O1xuIiwiaW1wb3J0IHsgSHViQ29udHJvbCB9IGZyb20gJy4uL2h1Yi1jb250cm9sJztcblxuZnVuY3Rpb24gbWFudWFsKGh1YkNvbnRyb2w6IEh1YkNvbnRyb2wpIHtcbiAgaWYgKGh1YkNvbnRyb2wuY29udHJvbC5zcGVlZCAhPT0gaHViQ29udHJvbC5wcmV2Q29udHJvbC5zcGVlZCB8fCBodWJDb250cm9sLmNvbnRyb2wudHVybkFuZ2xlICE9PSBodWJDb250cm9sLnByZXZDb250cm9sLnR1cm5BbmdsZSkge1xuICAgIGxldCBtb3RvckEgPSBodWJDb250cm9sLmNvbnRyb2wuc3BlZWQgKyAoaHViQ29udHJvbC5jb250cm9sLnR1cm5BbmdsZSA+IDAgPyBNYXRoLmFicyhodWJDb250cm9sLmNvbnRyb2wudHVybkFuZ2xlKSA6IDApO1xuICAgIGxldCBtb3RvckIgPSBodWJDb250cm9sLmNvbnRyb2wuc3BlZWQgKyAoaHViQ29udHJvbC5jb250cm9sLnR1cm5BbmdsZSA8IDAgPyBNYXRoLmFicyhodWJDb250cm9sLmNvbnRyb2wudHVybkFuZ2xlKSA6IDApO1xuXG4gICAgaWYgKG1vdG9yQSA+IDEwMCkge1xuICAgICAgbW90b3JCIC09IG1vdG9yQSAtIDEwMDtcbiAgICAgIG1vdG9yQSA9IDEwMDtcbiAgICB9XG5cbiAgICBpZiAobW90b3JCID4gMTAwKSB7XG4gICAgICBtb3RvckEgLT0gbW90b3JCIC0gMTAwO1xuICAgICAgbW90b3JCID0gMTAwO1xuICAgIH1cblxuICAgIGh1YkNvbnRyb2wuY29udHJvbC5tb3RvckEgPSBtb3RvckE7XG4gICAgaHViQ29udHJvbC5jb250cm9sLm1vdG9yQiA9IG1vdG9yQjtcblxuICAgIGh1YkNvbnRyb2wuaHViLm1vdG9yVGltZU11bHRpKDYwLCBtb3RvckEsIG1vdG9yQik7XG4gIH1cblxuICBpZiAoaHViQ29udHJvbC5jb250cm9sLnRpbHQucGl0Y2ggIT09IGh1YkNvbnRyb2wucHJldkNvbnRyb2wudGlsdC5waXRjaCkge1xuICAgIGh1YkNvbnRyb2wuaHViLm1vdG9yVGltZSgnQycsIDYwLCBodWJDb250cm9sLmNvbnRyb2wudGlsdC5waXRjaCk7XG4gIH1cblxuICBpZiAoaHViQ29udHJvbC5jb250cm9sLnRpbHQucm9sbCAhPT0gaHViQ29udHJvbC5wcmV2Q29udHJvbC50aWx0LnJvbGwpIHtcbiAgICBodWJDb250cm9sLmh1Yi5tb3RvclRpbWUoJ0QnLCA2MCwgaHViQ29udHJvbC5jb250cm9sLnRpbHQucm9sbCk7XG4gIH1cbn1cblxuZXhwb3J0IHsgbWFudWFsIH07XG4iLCJjb25zdCBCT09TVF9IVUJfU0VSVklDRV9VVUlEID0gJzAwMDAxNjIzLTEyMTItZWZkZS0xNjIzLTc4NWZlYWJjZDEyMyc7XG5jb25zdCBCT09TVF9DSEFSQUNURVJJU1RJQ19VVUlEID0gJzAwMDAxNjI0LTEyMTItZWZkZS0xNjIzLTc4NWZlYWJjZDEyMyc7XG5cbmV4cG9ydCBjbGFzcyBCb29zdENvbm5lY3RvciB7XG4gIHByaXZhdGUgc3RhdGljIGRldmljZTogQmx1ZXRvb3RoRGV2aWNlO1xuXG4gIHB1YmxpYyBzdGF0aWMgaXNXZWJCbHVldG9vdGhTdXBwb3J0ZWQgOiBib29sZWFuID0gIG5hdmlnYXRvci5ibHVldG9vdGggPyB0cnVlIDogZmFsc2U7XG4gIFxuICBwdWJsaWMgc3RhdGljIGFzeW5jIGNvbm5lY3QoZGlzY29ubmVjdENhbGxiYWNrOiAoKSA9PiBQcm9taXNlPHZvaWQ+KTogUHJvbWlzZTxCbHVldG9vdGhSZW1vdGVHQVRUQ2hhcmFjdGVyaXN0aWM+IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgYWNjZXB0QWxsRGV2aWNlczogZmFsc2UsXG4gICAgICBmaWx0ZXJzOiBbeyBzZXJ2aWNlczogW0JPT1NUX0hVQl9TRVJWSUNFX1VVSURdIH1dLFxuICAgICAgb3B0aW9uYWxTZXJ2aWNlczogW0JPT1NUX0hVQl9TRVJWSUNFX1VVSURdLFxuICAgIH07XG5cbiAgICB0aGlzLmRldmljZSA9IGF3YWl0IG5hdmlnYXRvci5ibHVldG9vdGgucmVxdWVzdERldmljZShvcHRpb25zKTtcblxuICAgIHRoaXMuZGV2aWNlLmFkZEV2ZW50TGlzdGVuZXIoJ2dhdHRzZXJ2ZXJkaXNjb25uZWN0ZWQnLCBhc3luYyBldmVudCA9PiB7XG4gICAgICBhd2FpdCBkaXNjb25uZWN0Q2FsbGJhY2soKTtcbiAgICB9KTtcblxuICAgIC8vIGF3YWl0IHRoaXMuZGV2aWNlLndhdGNoQWR2ZXJ0aXNlbWVudHMoKTtcblxuICAgIC8vIHRoaXMuZGV2aWNlLmFkZEV2ZW50TGlzdGVuZXIoJ2FkdmVydGlzZW1lbnRyZWNlaXZlZCcsIGV2ZW50ID0+IHtcbiAgICAvLyAgIC8vIEB0cy1pZ25vcmVcbiAgICAvLyAgIGNvbnNvbGUubG9nKGV2ZW50LnJzc2kpO1xuICAgIC8vIH0pO1xuXG4gICAgcmV0dXJuIEJvb3N0Q29ubmVjdG9yLmdldENoYXJhY3RlcmlzdGljKHRoaXMuZGV2aWNlKTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGFzeW5jIGdldENoYXJhY3RlcmlzdGljKGRldmljZTogQmx1ZXRvb3RoRGV2aWNlKTogUHJvbWlzZTxCbHVldG9vdGhSZW1vdGVHQVRUQ2hhcmFjdGVyaXN0aWM+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCBkZXZpY2UuZ2F0dC5jb25uZWN0KCk7XG4gICAgY29uc3Qgc2VydmljZSA9IGF3YWl0IHNlcnZlci5nZXRQcmltYXJ5U2VydmljZShCT09TVF9IVUJfU0VSVklDRV9VVUlEKTtcbiAgICByZXR1cm4gYXdhaXQgc2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYyhCT09TVF9DSEFSQUNURVJJU1RJQ19VVUlEKTtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgcmVjb25uZWN0KCk6IFByb21pc2U8W2Jvb2xlYW4sIEJsdWV0b290aFJlbW90ZUdBVFRDaGFyYWN0ZXJpc3RpY10+IHtcbiAgICBpZiAodGhpcy5kZXZpY2UpIHtcbiAgICAgIGNvbnN0IGJsdWV0b290aCA9IGF3YWl0IEJvb3N0Q29ubmVjdG9yLmdldENoYXJhY3RlcmlzdGljKHRoaXMuZGV2aWNlKTtcbiAgICAgIHJldHVybiBbdHJ1ZSwgYmx1ZXRvb3RoXTtcbiAgICB9XG4gICAgcmV0dXJuIFtmYWxzZSwgbnVsbF07XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGRpc2Nvbm5lY3QoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuZGV2aWNlKSB7XG4gICAgICB0aGlzLmRldmljZS5nYXR0LmRpc2Nvbm5lY3QoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiIsImltcG9ydCBMZWdvQm9vc3QgZnJvbSAnLi9sZWdvQm9vc3QnO1xuaW1wb3J0IHsgQm9vc3RDb25uZWN0b3IgfSBmcm9tICcuL2Jvb3N0Q29ubmVjdG9yJztcblxuY29uc3QgYm9vc3QgPSBuZXcgTGVnb0Jvb3N0KCk7XG5cbi8vIEB0cy1pZ25vcmVcbndpbmRvdy5ib29zdCA9IGJvb3N0O1xuXG4vLyBAdHMtaWdub3JlXG5ib29zdC5sb2dEZWJ1ZyA9IGNvbnNvbGUubG9nO1xuXG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gaW1wb3J0KCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSBpbXBvcnQoJ2llZWU3NTQnKVxuXG5jb25zdCBJTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5jb25zdCBrTWF4TGVuZ3RoID0gS19NQVhfTEVOR1RIXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFByaW50IHdhcm5pbmcgYW5kIHJlY29tbWVuZCB1c2luZyBgYnVmZmVyYCB2NC54IHdoaWNoIGhhcyBhbiBPYmplY3RcbiAqICAgICAgICAgICAgICAgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIFdlIHJlcG9ydCB0aGF0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGlmIHRoZSBhcmUgbm90IHN1YmNsYXNzYWJsZVxuICogdXNpbmcgX19wcm90b19fLiBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YFxuICogKFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4KS4gSUUgMTAgbGFja3Mgc3VwcG9ydFxuICogZm9yIF9fcHJvdG9fXyBhbmQgaGFzIGEgYnVnZ3kgdHlwZWQgYXJyYXkgaW1wbGVtZW50YXRpb24uXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5pZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb25zb2xlLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgJ1RoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAnICtcbiAgICAnYGJ1ZmZlcmAgdjUueC4gVXNlIGBidWZmZXJgIHY0LnggaWYgeW91IHJlcXVpcmUgb2xkIGJyb3dzZXIgc3VwcG9ydC4nXG4gIClcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICAvLyBDYW4gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWQ/XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGFyci5fX3Byb3RvX18gPSB7IF9fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfSB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwgJ3BhcmVudCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpIHJldHVybiB1bmRlZmluZWRcbiAgICByZXR1cm4gdGhpcy5idWZmZXJcbiAgfVxufSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdvZmZzZXQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnl0ZU9mZnNldFxuICB9XG59KVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyBsZW5ndGggKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICAvLyBAdHMtaWdub3JlXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAnVGhlIFwic3RyaW5nXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4gUmVjZWl2ZWQgdHlwZSBudW1iZXInXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZShhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20oYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgIT0gbnVsbCAmJlxuICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgIHZhbHVlOiBudWxsLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICB3cml0YWJsZTogZmFsc2VcbiAgfSlcbn1cblxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbmZ1bmN0aW9uIGZyb20gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2UodmFsdWUpXG4gIH1cblxuICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgIHRocm93IFR5cGVFcnJvcihcbiAgICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgICApXG4gIH1cblxuICBpZiAoaXNJbnN0YW5jZSh2YWx1ZSwgQXJyYXlCdWZmZXIpIHx8XG4gICAgICAodmFsdWUgJiYgaXNJbnN0YW5jZSh2YWx1ZS5idWZmZXIsIEFycmF5QnVmZmVyKSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBvZiB0eXBlIG51bWJlci4gUmVjZWl2ZWQgdHlwZSBudW1iZXInXG4gICAgKVxuICB9XG5cbiAgdmFyIHZhbHVlT2YgPSB2YWx1ZS52YWx1ZU9mICYmIHZhbHVlLnZhbHVlT2YoKVxuICBpZiAodmFsdWVPZiAhPSBudWxsICYmIHZhbHVlT2YgIT09IHZhbHVlKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlT2YsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIHZhciBiID0gZnJvbU9iamVjdCh2YWx1ZSlcbiAgaWYgKGIpIHJldHVybiBiXG5cbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1ByaW1pdGl2ZSAhPSBudWxsICYmXG4gICAgICB0eXBlb2YgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShcbiAgICAgIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0oJ3N0cmluZycpLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGhcbiAgICApXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAnb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdmFsdWUpXG4gIClcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIFwiJyArIHNpemUgKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgID8gY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpIFxuICAgICAgOiBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsKVxuICB9XG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiBhbGxvYyhzaXplWywgZmlsbFssIGVuY29kaW5nXV0pXG4gKiovXG5CdWZmZXIuYWxsb2MgPSBmdW5jdGlvbiAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGFsbG9jKHNpemUsIGZpbGwsIGVuY29kaW5nKVxufVxuXG5mdW5jdGlvbiBhbGxvY1Vuc2FmZSAoc2l6ZSkge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSA8IDAgPyAwIDogY2hlY2tlZChzaXplKSB8IDApXG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG5cbiAgLy8gQHRzLWlnbm9yZVxuICB2YXIgYWN0dWFsID0gYnVmLndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICBidWYgPSBidWYuc2xpY2UoMCwgYWN0dWFsKVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlIChhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgYnVmW2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJvZmZzZXRcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcImxlbmd0aFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICB2YXIgYnVmXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKG9iaikge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iaikpIHtcbiAgICB2YXIgbGVuID0gY2hlY2tlZChvYmoubGVuZ3RoKSB8IDBcbiAgICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbilcblxuICAgIGlmIChidWYubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYnVmXG4gICAgfVxuXG4gICAgb2JqLmNvcHkoYnVmLCAwLCAwLCBsZW4pXG4gICAgcmV0dXJuIGJ1ZlxuICB9XG5cbiAgaWYgKG9iai5sZW5ndGggIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIoMClcbiAgICB9XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKVxuICB9XG5cbiAgaWYgKG9iai50eXBlID09PSAnQnVmZmVyJyAmJiBBcnJheS5pc0FycmF5KG9iai5kYXRhKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iai5kYXRhKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBLX01BWF9MRU5HVEhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIEtfTUFYX0xFTkdUSC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4vLyBAdHMtaWdub3JlXG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuIGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlciA9PT0gdHJ1ZSAmJlxuICAgIGIgIT09IEJ1ZmZlci5wcm90b3R5cGUgLy8gc28gQnVmZmVyLmlzQnVmZmVyKEJ1ZmZlci5wcm90b3R5cGUpIHdpbGwgYmUgZmFsc2Vcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmIChpc0luc3RhbmNlKGEsIFVpbnQ4QXJyYXkpKSBhID0gQnVmZmVyLmZyb20oYSwgYS5vZmZzZXQsIGEuYnl0ZUxlbmd0aClcbiAgaWYgKGlzSW5zdGFuY2UoYiwgVWludDhBcnJheSkpIGIgPSBCdWZmZXIuZnJvbShiLCBiLm9mZnNldCwgYi5ieXRlTGVuZ3RoKVxuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJidWYxXCIsIFwiYnVmMlwiIGFyZ3VtZW50cyBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5J1xuICAgIClcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnbGF0aW4xJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoaXNJbnN0YW5jZShidWYsIFVpbnQ4QXJyYXkpKSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBidWYgPSBCdWZmZXIuZnJvbShidWYpXG4gICAgfVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IGlzSW5zdGFuY2Uoc3RyaW5nLCBBcnJheUJ1ZmZlcikpIHtcbiAgICByZXR1cm4gc3RyaW5nLmJ5dGVMZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIG9yIEFycmF5QnVmZmVyLiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2Ygc3RyaW5nXG4gICAgKVxuICB9XG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIG11c3RNYXRjaCA9IChhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gPT09IHRydWUpXG4gIGlmICghbXVzdE1hdGNoICYmIGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiBsZW4gKiAyXG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gbGVuID4+PiAxXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB7XG4gICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgIHJldHVybiBtdXN0TWF0Y2ggPyAtMSA6IHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIH1cbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgLy8gTm8gbmVlZCB0byB2ZXJpZnkgdGhhdCBcInRoaXMubGVuZ3RoIDw9IE1BWF9VSU5UMzJcIiBzaW5jZSBpdCdzIGEgcmVhZC1vbmx5XG4gIC8vIHByb3BlcnR5IG9mIGEgdHlwZWQgYXJyYXkuXG5cbiAgLy8gVGhpcyBiZWhhdmVzIG5laXRoZXIgbGlrZSBTdHJpbmcgbm9yIFVpbnQ4QXJyYXkgaW4gdGhhdCB3ZSBzZXQgc3RhcnQvZW5kXG4gIC8vIHRvIHRoZWlyIHVwcGVyL2xvd2VyIGJvdW5kcyBpZiB0aGUgdmFsdWUgcGFzc2VkIGlzIG91dCBvZiByYW5nZS5cbiAgLy8gdW5kZWZpbmVkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGFzIHBlciBFQ01BLTI2MiA2dGggRWRpdGlvbixcbiAgLy8gU2VjdGlvbiAxMy4zLjMuNyBSdW50aW1lIFNlbWFudGljczogS2V5ZWRCaW5kaW5nSW5pdGlhbGl6YXRpb24uXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIC8vIFJldHVybiBlYXJseSBpZiBzdGFydCA+IHRoaXMubGVuZ3RoLiBEb25lIGhlcmUgdG8gcHJldmVudCBwb3RlbnRpYWwgdWludDMyXG4gIC8vIGNvZXJjaW9uIGZhaWwgYmVsb3cuXG4gIGlmIChzdGFydCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKGVuZCA8PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICAvLyBGb3JjZSBjb2Vyc2lvbiB0byB1aW50MzIuIFRoaXMgd2lsbCBhbHNvIGNvZXJjZSBmYWxzZXkvTmFOIHZhbHVlcyB0byAwLlxuICBlbmQgPj4+PSAwXG4gIHN0YXJ0ID4+Pj0gMFxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGlzIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgKGFuZCB0aGUgYGlzLWJ1ZmZlcmAgbnBtIHBhY2thZ2UpXG4vLyB0byBkZXRlY3QgYSBCdWZmZXIgaW5zdGFuY2UuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHVzZSBgaW5zdGFuY2VvZiBCdWZmZXJgXG4vLyByZWxpYWJseSBpbiBhIGJyb3dzZXJpZnkgY29udGV4dCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG11bHRpcGxlIGRpZmZlcmVudFxuLy8gY29waWVzIG9mIHRoZSAnYnVmZmVyJyBwYWNrYWdlIGluIHVzZS4gVGhpcyBtZXRob2Qgd29ya3MgZXZlbiBmb3IgQnVmZmVyXG4vLyBpbnN0YW5jZXMgdGhhdCB3ZXJlIGNyZWF0ZWQgZnJvbSBhbm90aGVyIGNvcHkgb2YgdGhlIGBidWZmZXJgIHBhY2thZ2UuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNTRcbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDY0ID0gZnVuY3Rpb24gc3dhcDY0ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA4ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA2NC1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgNylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgNilcbiAgICBzd2FwKHRoaXMsIGkgKyAyLCBpICsgNSlcbiAgICBzd2FwKHRoaXMsIGkgKyAzLCBpICsgNClcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmcgPSBCdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nXG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBJTlNQRUNUX01BWF9CWVRFU1xuICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLnJlcGxhY2UoLyguezJ9KS9nLCAnJDEgJykudHJpbSgpXG4gIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKGlzSW5zdGFuY2UodGFyZ2V0LCBVaW50OEFycmF5KSkge1xuICAgIHRhcmdldCA9IEJ1ZmZlci5mcm9tKHRhcmdldCwgdGFyZ2V0Lm9mZnNldCwgdGFyZ2V0LmJ5dGVMZW5ndGgpXG4gIH1cbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidGFyZ2V0XCIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheS4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB0YXJnZXQpXG4gICAgKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdmFsID0gQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHNlYXJjaCBlaXRoZXIgaW5kZXhPZiAoaWYgZGlyIGlzIHRydWUpIG9yIGxhc3RJbmRleE9mXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIC8vIFNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nL2J1ZmZlciBhbHdheXMgZmFpbHNcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAweEZGIC8vIFNlYXJjaCBmb3IgYSBieXRlIHZhbHVlIFswLTI1NV1cbiAgICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkaXIpIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgWyB2YWwgXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKG51bWJlcklzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoID4+PiAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGxhdGluMVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgLy8gQHRzLWlnbm9yZVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgLy8gQHRzLWlnbm9yZVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgLy8gQHRzLWlnbm9yZVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICAvLyBAdHMtaWdub3JlXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgLy8gQHRzLWlnbm9yZVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICAvLyBAdHMtaWdub3JlXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgc2hvdWxkIGJlIGEgQnVmZmVyJylcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgdHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmNvcHlXaXRoaW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBVc2UgYnVpbHQtaW4gd2hlbiBhdmFpbGFibGUsIG1pc3NpbmcgZnJvbSBJRTExXG4gICAgdGhpcy5jb3B5V2l0aGluKHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKVxuICB9IGVsc2UgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yICh2YXIgaSA9IGxlbiAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoKGVuY29kaW5nID09PSAndXRmOCcgJiYgY29kZSA8IDEyOCkgfHxcbiAgICAgICAgICBlbmNvZGluZyA9PT0gJ2xhdGluMScpIHtcbiAgICAgICAgLy8gRmFzdCBwYXRoOiBJZiBgdmFsYCBmaXRzIGludG8gYSBzaW5nbGUgYnl0ZSwgdXNlIHRoYXQgbnVtZXJpYyB2YWx1ZS5cbiAgICAgICAgdmFsID0gY29kZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDI1NVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICA6IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyB2YWwgK1xuICAgICAgICAnXCIgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgXCJ2YWx1ZVwiJylcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSB0YWtlcyBlcXVhbCBzaWducyBhcyBlbmQgb2YgdGhlIEJhc2U2NCBlbmNvZGluZ1xuICBzdHIgPSBzdHIuc3BsaXQoJz0nKVswXVxuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICAvLyBAdHMtaWdub3JlXG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuLy8gQXJyYXlCdWZmZXIgb3IgVWludDhBcnJheSBvYmplY3RzIGZyb20gb3RoZXIgY29udGV4dHMgKGkuZS4gaWZyYW1lcykgZG8gbm90IHBhc3Ncbi8vIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2sgYnV0IHRoZXkgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgb2YgdGhhdCB0eXBlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0luc3RhbmNlIChvYmosIHR5cGUpIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIHR5cGUgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgIT0gbnVsbCAmJlxuICAgICAgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09IHR5cGUubmFtZSlcbn1cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgLy8gRm9yIElFMTEgc3VwcG9ydFxuICByZXR1cm4gb2JqICE9PSBvYmogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cblxuZXhwb3J0IHsgQnVmZmVyLCBTbG93QnVmZmVyLCBJTlNQRUNUX01BWF9CWVRFUywga01heExlbmd0aCB9IiwiLy8gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vbXVkZ2UvNTgzMDM4MiNnaXN0Y29tbWVudC0yNjU4NzIxXG5cbnR5cGUgTGlzdGVuZXIgPSAoLi4uYXJnczogYW55W10pID0+IHZvaWQ7XG5pbnRlcmZhY2UgSUV2ZW50cyB7XG4gIFtldmVudDogc3RyaW5nXTogTGlzdGVuZXJbXTtcbn1cblxuZXhwb3J0IGNsYXNzIEV2ZW50RW1pdHRlcjxUIGV4dGVuZHMgc3RyaW5nPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZXZlbnRzOiBJRXZlbnRzID0ge307XG5cbiAgcHVibGljIG9uKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiBMaXN0ZW5lcik6ICgpID0+IHZvaWQge1xuICAgIGlmICh0eXBlb2YgdGhpcy5ldmVudHNbZXZlbnRdICE9PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5ldmVudHNbZXZlbnRdID0gW107XG4gICAgfVxuXG4gICAgdGhpcy5ldmVudHNbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cblxuICBwdWJsaWMgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6IExpc3RlbmVyKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmV2ZW50c1tldmVudF0gIT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgaWR4OiBudW1iZXIgPSB0aGlzLmV2ZW50c1tldmVudF0uaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgaWYgKGlkeCA+IC0xKSB7XG4gICAgICB0aGlzLmV2ZW50c1tldmVudF0uc3BsaWNlKGlkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHJlbW92ZUFsbExpc3RlbmVycygpOiB2b2lkIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLmV2ZW50cykuZm9yRWFjaCgoZXZlbnQ6IHN0cmluZykgPT4gdGhpcy5ldmVudHNbZXZlbnRdLnNwbGljZSgwLCB0aGlzLmV2ZW50c1tldmVudF0ubGVuZ3RoKSk7XG4gIH1cblxuICBwdWJsaWMgZW1pdChldmVudDogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgIGlmICh0eXBlb2YgdGhpcy5ldmVudHNbZXZlbnRdICE9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIFsuLi50aGlzLmV2ZW50c1tldmVudF1dLmZvckVhY2gobGlzdGVuZXIgPT4gbGlzdGVuZXIuYXBwbHkodGhpcywgYXJncykpO1xuICB9XG5cbiAgcHVibGljIG9uY2UoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6IExpc3RlbmVyKTogKCkgPT4gdm9pZCB7XG4gICAgY29uc3QgcmVtb3ZlOiAoKSA9PiB2b2lkID0gdGhpcy5vbihldmVudCwgKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG4gICAgICByZW1vdmUoKTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlbW92ZTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnLi4vaGVscGVycy9ldmVudEVtaXR0ZXInO1xuaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSAnLi4vaGVscGVycy9idWZmZXInO1xuaW1wb3J0IHsgUmF3RGF0YSB9IGZyb20gJy4uL3R5cGVzJztcblxudHlwZSBEZXZpY2UgPSAnTEVEJyB8ICdESVNUQU5DRScgfCAnSU1PVE9SJyB8ICdNT1RPUicgfCAnVElMVCc7XG5cbnR5cGUgUG9ydCA9ICdBJyB8ICdCJyB8ICdDJyB8ICdEJyB8ICdBQicgfCAnTEVEJyB8ICdUSUxUJztcblxudHlwZSBMZWRDb2xvciA9XG4gIHwgJ29mZidcbiAgfCAncGluaydcbiAgfCAncHVycGxlJ1xuICB8ICdibHVlJ1xuICB8ICdsaWdodGJsdWUnXG4gIHwgJ2N5YW4nXG4gIHwgJ2dyZWVuJ1xuICB8ICd5ZWxsb3cnXG4gIHwgJ29yYW5nZSdcbiAgfCAncmVkJ1xuICB8ICd3aGl0ZSc7XG5cbmV4cG9ydCBjbGFzcyBIdWIge1xuICBlbWl0dGVyOiBFdmVudEVtaXR0ZXI8YW55PiA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBibHVldG9vdGg6IEJsdWV0b290aFJlbW90ZUdBVFRDaGFyYWN0ZXJpc3RpYztcblxuICBsb2c6IChtZXNzYWdlPzogYW55LCAuLi5vcHRpb25hbFBhcmFtczogYW55W10pID0+IHZvaWQ7XG4gIGxvZ0RlYnVnOiAobWVzc2FnZT86IGFueSwgLi4ub3B0aW9uYWxQYXJhbXM6IGFueVtdKSA9PiB2b2lkO1xuXG4gIGF1dG9TdWJzY3JpYmU6IGJvb2xlYW4gPSB0cnVlO1xuICBwb3J0czogeyBba2V5OiBzdHJpbmddOiBhbnkgfTtcbiAgbnVtMnR5cGU6IHsgW2tleTogbnVtYmVyXTogRGV2aWNlIH07XG4gIHBvcnQybnVtOiB7IFtrZXkgaW4gUG9ydF06IG51bWJlciB9O1xuICBudW0ycG9ydDogeyBba2V5OiBudW1iZXJdOiBzdHJpbmcgfTtcbiAgbnVtMmFjdGlvbjogeyBba2V5OiBudW1iZXJdOiBzdHJpbmcgfTtcbiAgbnVtMmNvbG9yOiB7IFtrZXk6IG51bWJlcl06IHN0cmluZyB9O1xuICBsZWRDb2xvcnM6IExlZENvbG9yW107XG4gIHBvcnRJbmZvVGltZW91dDogbnVtYmVyO1xuICBub1JlY29ubmVjdDogYm9vbGVhbjtcbiAgY29ubmVjdGVkOiBib29sZWFuO1xuICByc3NpOiBudW1iZXI7XG4gIHJlY29ubmVjdDogYm9vbGVhbjtcblxuICB3cml0ZUN1ZTogYW55ID0gW107XG4gIGlzV3JpdGluZzogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHByaXZhdGUgZW1pdCh0eXBlOiBzdHJpbmcsIGRhdGE6IGFueSA9IG51bGwpIHtcbiAgICB0aGlzLmVtaXR0ZXIuZW1pdCh0eXBlLCBkYXRhKTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKGJsdWV0b290aDogQmx1ZXRvb3RoUmVtb3RlR0FUVENoYXJhY3RlcmlzdGljKSB7XG4gICAgdGhpcy5ibHVldG9vdGggPSBibHVldG9vdGg7XG4gICAgdGhpcy5sb2cgPSBjb25zb2xlLmxvZztcbiAgICB0aGlzLmF1dG9TdWJzY3JpYmUgPSB0cnVlO1xuICAgIHRoaXMucG9ydHMgPSB7fTtcbiAgICB0aGlzLm51bTJ0eXBlID0ge1xuICAgICAgMjM6ICdMRUQnLFxuICAgICAgMzc6ICdESVNUQU5DRScsXG4gICAgICAzODogJ0lNT1RPUicsXG4gICAgICAzOTogJ01PVE9SJyxcbiAgICAgIDQwOiAnVElMVCcsXG4gICAgfTtcbiAgICB0aGlzLnBvcnQybnVtID0ge1xuICAgICAgQTogMHgwMCxcbiAgICAgIEI6IDB4MDEsXG4gICAgICBDOiAweDAyLFxuICAgICAgRDogMHgwMyxcbiAgICAgIEFCOiAweDEwLFxuICAgICAgTEVEOiAweDMyLFxuICAgICAgVElMVDogMHgzYSxcbiAgICB9O1xuICAgIHRoaXMubnVtMnBvcnQgPSBPYmplY3QuZW50cmllcyh0aGlzLnBvcnQybnVtKS5yZWR1Y2UoKGFjYywgW3BvcnQsIHBvcnROdW1dKSA9PiB7XG4gICAgICBhY2NbcG9ydE51bV0gPSBwb3J0O1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG4gICAgdGhpcy5udW0yYWN0aW9uID0ge1xuICAgICAgMTogJ3N0YXJ0JyxcbiAgICAgIDU6ICdjb25mbGljdCcsXG4gICAgICAxMDogJ3N0b3AnLFxuICAgIH07XG4gICAgdGhpcy5udW0yY29sb3IgPSB7XG4gICAgICAwOiAnYmxhY2snLFxuICAgICAgMzogJ2JsdWUnLFxuICAgICAgNTogJ2dyZWVuJyxcbiAgICAgIDc6ICd5ZWxsb3cnLFxuICAgICAgOTogJ3JlZCcsXG4gICAgICAxMDogJ3doaXRlJyxcbiAgICB9O1xuICAgIHRoaXMubGVkQ29sb3JzID0gW1xuICAgICAgJ29mZicsXG4gICAgICAncGluaycsXG4gICAgICAncHVycGxlJyxcbiAgICAgICdibHVlJyxcbiAgICAgICdsaWdodGJsdWUnLFxuICAgICAgJ2N5YW4nLFxuICAgICAgJ2dyZWVuJyxcbiAgICAgICd5ZWxsb3cnLFxuICAgICAgJ29yYW5nZScsXG4gICAgICAncmVkJyxcbiAgICAgICd3aGl0ZScsXG4gICAgXTtcblxuICAgIHRoaXMuYWRkTGlzdGVuZXJzKCk7XG4gIH1cblxuICBwcml2YXRlIGFkZExpc3RlbmVycygpIHtcbiAgICB0aGlzLmJsdWV0b290aC5hZGRFdmVudExpc3RlbmVyKCdjaGFyYWN0ZXJpc3RpY3ZhbHVlY2hhbmdlZCcsIGV2ZW50ID0+IHtcbiAgICAgIC8vIGh0dHBzOi8vZ29vZ2xlY2hyb21lLmdpdGh1Yi5pby9zYW1wbGVzL3dlYi1ibHVldG9vdGgvcmVhZC1jaGFyYWN0ZXJpc3RpYy12YWx1ZS1jaGFuZ2VkLmh0bWxcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGNvbnN0IGRhdGEgPSBCdWZmZXIuZnJvbShldmVudC50YXJnZXQudmFsdWUuYnVmZmVyKTtcbiAgICAgIHRoaXMucGFyc2VNZXNzYWdlKGRhdGEpO1xuICAgIH0pO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAvLyBXaXRob3V0IHRpbW91dCBtaXNzZWQgZmlyc3QgY2hhcmFjdGVyaXN0aWN2YWx1ZWNoYW5nZWQgZXZlbnRzXG4gICAgICB0aGlzLmJsdWV0b290aC5zdGFydE5vdGlmaWNhdGlvbnMoKTtcbiAgICB9LCAxMDAwKTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VNZXNzYWdlKGRhdGE6IGFueSkge1xuICAgIHN3aXRjaCAoZGF0YVsyXSkge1xuICAgICAgY2FzZSAweDA0OiB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnBvcnRJbmZvVGltZW91dCk7XG4gICAgICAgIHRoaXMucG9ydEluZm9UaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiBhIGNvbm5lY3Rpb24gdG8gdGhlIE1vdmUgSHViIGlzIGVzdGFibGlzaGVkXG4gICAgICAgICAgICogQGV2ZW50IEh1YiNjb25uZWN0XG4gICAgICAgICAgICovXG4gICAgICAgICAgaWYgKHRoaXMuYXV0b1N1YnNjcmliZSkge1xuICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmVBbGwoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDEwMDApO1xuXG4gICAgICAgIHRoaXMubG9nKCdGb3VuZDogJyArIHRoaXMubnVtMnR5cGVbZGF0YVs1XV0pO1xuICAgICAgICB0aGlzLmxvZ0RlYnVnKCdGb3VuZCcsIGRhdGEpO1xuXG4gICAgICAgIGlmIChkYXRhWzRdID09PSAweDAxKSB7XG4gICAgICAgICAgdGhpcy5wb3J0c1tkYXRhWzNdXSA9IHtcbiAgICAgICAgICAgIHR5cGU6ICdwb3J0JyxcbiAgICAgICAgICAgIGRldmljZVR5cGU6IHRoaXMubnVtMnR5cGVbZGF0YVs1XV0sXG4gICAgICAgICAgICBkZXZpY2VUeXBlTnVtOiBkYXRhWzVdLFxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YVs0XSA9PT0gMHgwMikge1xuICAgICAgICAgIHRoaXMucG9ydHNbZGF0YVszXV0gPSB7XG4gICAgICAgICAgICB0eXBlOiAnZ3JvdXAnLFxuICAgICAgICAgICAgZGV2aWNlVHlwZTogdGhpcy5udW0ydHlwZVtkYXRhWzVdXSxcbiAgICAgICAgICAgIGRldmljZVR5cGVOdW06IGRhdGFbNV0sXG4gICAgICAgICAgICBtZW1iZXJzOiBbZGF0YVs3XSwgZGF0YVs4XV0sXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgMHgwNToge1xuICAgICAgICB0aGlzLmxvZygnTWFsZm9ybWVkIG1lc3NhZ2UnKTtcbiAgICAgICAgdGhpcy5sb2coJzwnLCBkYXRhKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIDB4NDU6IHtcbiAgICAgICAgdGhpcy5wYXJzZVNlbnNvcihkYXRhKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIDB4NDc6IHtcbiAgICAgICAgLy8gMHg0NyBzdWJzY3JpcHRpb24gYWNrbm93bGVkZ2VtZW50c1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vSm9yZ2VQZS9CT09TVHJldmVuZy9ibG9iL21hc3Rlci9Ob3RpZmljYXRpb25zLm1kXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSAweDgyOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyBvbiBwb3J0IGNoYW5nZXNcbiAgICAgICAgICogQGV2ZW50IEh1YiNwb3J0XG4gICAgICAgICAqIEBwYXJhbSBwb3J0IHtvYmplY3R9XG4gICAgICAgICAqIEBwYXJhbSBwb3J0LnBvcnQge3N0cmluZ31cbiAgICAgICAgICogQHBhcmFtIHBvcnQuYWN0aW9uIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ3BvcnQnLCB7XG4gICAgICAgICAgcG9ydDogdGhpcy5udW0ycG9ydFtkYXRhWzNdXSxcbiAgICAgICAgICBhY3Rpb246IHRoaXMubnVtMmFjdGlvbltkYXRhWzRdXSxcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5sb2coJ3Vua25vd24gbWVzc2FnZSB0eXBlIDB4JyArIGRhdGFbMl0udG9TdHJpbmcoMTYpKTtcbiAgICAgICAgdGhpcy5sb2coJzwnLCBkYXRhKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlU2Vuc29yKGRhdGE6IGFueSkge1xuICAgIGlmICghdGhpcy5wb3J0c1tkYXRhWzNdXSkge1xuICAgICAgdGhpcy5sb2coJ3BhcnNlU2Vuc29yIHVua25vd24gcG9ydCAweCcgKyBkYXRhWzNdLnRvU3RyaW5nKDE2KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN3aXRjaCAodGhpcy5wb3J0c1tkYXRhWzNdXS5kZXZpY2VUeXBlKSB7XG4gICAgICBjYXNlICdESVNUQU5DRSc6IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBldmVudCBIdWIjY29sb3JcbiAgICAgICAgICogQHBhcmFtIGNvbG9yIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ2NvbG9yJywgdGhpcy5udW0yY29sb3JbZGF0YVs0XV0pO1xuXG4gICAgICAgIC8vIFRPRE86IGltcHJvdmUgZGlzdGFuY2UgY2FsY3VsYXRpb24hXG4gICAgICAgIGxldCBkaXN0YW5jZTogbnVtYmVyO1xuICAgICAgICBpZiAoZGF0YVs3XSA+IDAgJiYgZGF0YVs1XSA8IDIpIHtcbiAgICAgICAgICBkaXN0YW5jZSA9IE1hdGguZmxvb3IoMjAgLSBkYXRhWzddICogMi44NSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YVs1XSA+IDkpIHtcbiAgICAgICAgICBkaXN0YW5jZSA9IEluZmluaXR5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRpc3RhbmNlID0gTWF0aC5mbG9vcigyMCArIGRhdGFbNV0gKiAxOCk7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBldmVudCBIdWIjZGlzdGFuY2VcbiAgICAgICAgICogQHBhcmFtIGRpc3RhbmNlIHtudW1iZXJ9IGRpc3RhbmNlIGluIG1pbGxpbWV0ZXJzXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ2Rpc3RhbmNlJywgZGlzdGFuY2UpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgJ1RJTFQnOiB7XG4gICAgICAgIGNvbnN0IHJvbGwgPSBkYXRhLnJlYWRJbnQ4KDQpO1xuICAgICAgICBjb25zdCBwaXRjaCA9IGRhdGEucmVhZEludDgoNSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBldmVudCBIdWIjdGlsdFxuICAgICAgICAgKiBAcGFyYW0gdGlsdCB7b2JqZWN0fVxuICAgICAgICAgKiBAcGFyYW0gdGlsdC5yb2xsIHtudW1iZXJ9XG4gICAgICAgICAqIEBwYXJhbSB0aWx0LnBpdGNoIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ3RpbHQnLCB7IHJvbGwsIHBpdGNoIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgJ01PVE9SJzpcbiAgICAgIGNhc2UgJ0lNT1RPUic6IHtcbiAgICAgICAgY29uc3QgYW5nbGUgPSBkYXRhLnJlYWRJbnQzMkxFKDQpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZXZlbnQgSHViI3JvdGF0aW9uXG4gICAgICAgICAqIEBwYXJhbSByb3RhdGlvbiB7b2JqZWN0fVxuICAgICAgICAgKiBAcGFyYW0gcm90YXRpb24ucG9ydCB7c3RyaW5nfVxuICAgICAgICAgKiBAcGFyYW0gcm90YXRpb24uYW5nbGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1pdCgncm90YXRpb24nLCB7XG4gICAgICAgICAgcG9ydDogdGhpcy5udW0ycG9ydFtkYXRhWzNdXSxcbiAgICAgICAgICBhbmdsZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5sb2coJ3Vua25vd24gc2Vuc29yIHR5cGUgMHgnICsgZGF0YVszXS50b1N0cmluZygxNiksIGRhdGFbM10sIHRoaXMucG9ydHNbZGF0YVszXV0uZGV2aWNlVHlwZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCBNb3ZlIEh1YiBhcyBkaXNjb25uZWN0ZWRcbiAgICogQG1ldGhvZCBIdWIjc2V0RGlzY29ubmVjdGVkXG4gICAqL1xuICBzZXREaXNjb25uZWN0ZWQoKSB7XG4gICAgLy8gVE9ETzogU2hvdWxkIGdldCB0aGlzIGZyb20gc29tZSBub3RpZmljYXRpb24/XG4gICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vUmVjb25uZWN0ID0gdHJ1ZTtcbiAgICB0aGlzLndyaXRlQ3VlID0gW107XG4gIH1cblxuICAvKipcbiAgICogUnVuIGEgbW90b3IgZm9yIHNwZWNpZmljIHRpbWVcbiAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBwb3J0IHBvc3NpYmxlIHN0cmluZyB2YWx1ZXM6IGBBYCwgYEJgLCBgQUJgLCBgQ2AsIGBEYC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHNcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkdXR5Q3ljbGU9MTAwXSBtb3RvciBwb3dlciBwZXJjZW50YWdlIGZyb20gYC0xMDBgIHRvIGAxMDBgLiBJZiBhIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuIHJvdGF0aW9uXG4gICAqIGlzIGNvdW50ZXJjbG9ja3dpc2UuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja11cbiAgICovXG4gIG1vdG9yVGltZShwb3J0OiBzdHJpbmcgfCBudW1iZXIsIHNlY29uZHM6IG51bWJlciwgZHV0eUN5Y2xlOiBudW1iZXIsIGNhbGxiYWNrPzogKCkgPT4gdm9pZCkge1xuICAgIGlmICh0eXBlb2YgZHV0eUN5Y2xlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IGR1dHlDeWNsZTtcbiAgICAgIGR1dHlDeWNsZSA9IDEwMDtcbiAgICB9XG4gICAgY29uc3QgcG9ydE51bSA9IHR5cGVvZiBwb3J0ID09PSAnc3RyaW5nJyA/IHRoaXMucG9ydDJudW1bcG9ydF0gOiBwb3J0O1xuICAgIHRoaXMud3JpdGUodGhpcy5lbmNvZGVNb3RvclRpbWUocG9ydE51bSwgc2Vjb25kcywgZHV0eUN5Y2xlKSwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biBib3RoIG1vdG9ycyAoQSBhbmQgQikgZm9yIHNwZWNpZmljIHRpbWVcbiAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHNcbiAgICogQHBhcmFtIHtudW1iZXJ9IGR1dHlDeWNsZUEgbW90b3IgcG93ZXIgcGVyY2VudGFnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiByb3RhdGlvblxuICAgKiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gZHV0eUN5Y2xlQiBtb3RvciBwb3dlciBwZXJjZW50YWdlIGZyb20gYC0xMDBgIHRvIGAxMDBgLiBJZiBhIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuIHJvdGF0aW9uXG4gICAqIGlzIGNvdW50ZXJjbG9ja3dpc2UuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqL1xuICBtb3RvclRpbWVNdWx0aShzZWNvbmRzOiBudW1iZXIsIGR1dHlDeWNsZUE6IG51bWJlciwgZHV0eUN5Y2xlQjogbnVtYmVyLCBjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcbiAgICB0aGlzLndyaXRlKHRoaXMuZW5jb2RlTW90b3JUaW1lTXVsdGkodGhpcy5wb3J0Mm51bVsnQUInXSwgc2Vjb25kcywgZHV0eUN5Y2xlQSwgZHV0eUN5Y2xlQiksIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUdXJuIGEgbW90b3IgYnkgc3BlY2lmaWMgYW5nbGVcbiAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBwb3J0IHBvc3NpYmxlIHN0cmluZyB2YWx1ZXM6IGBBYCwgYEJgLCBgQUJgLCBgQ2AsIGBEYC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGFuZ2xlIC0gZGVncmVlcyB0byB0dXJuIGZyb20gYDBgIHRvIGAyMTQ3NDgzNjQ3YFxuICAgKiBAcGFyYW0ge251bWJlcn0gW2R1dHlDeWNsZT0xMDBdIG1vdG9yIHBvd2VyIHBlcmNlbnRhZ2UgZnJvbSBgLTEwMGAgdG8gYDEwMGAuIElmIGEgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW5cbiAgICogcm90YXRpb24gaXMgY291bnRlcmNsb2Nrd2lzZS5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXVxuICAgKi9cbiAgbW90b3JBbmdsZShwb3J0OiBzdHJpbmcgfCBudW1iZXIsIGFuZ2xlOiBudW1iZXIsIGR1dHlDeWNsZTogbnVtYmVyLCBjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcbiAgICBpZiAodHlwZW9mIGR1dHlDeWNsZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBkdXR5Q3ljbGU7XG4gICAgICBkdXR5Q3ljbGUgPSAxMDA7XG4gICAgfVxuICAgIGNvbnN0IHBvcnROdW0gPSB0eXBlb2YgcG9ydCA9PT0gJ3N0cmluZycgPyB0aGlzLnBvcnQybnVtW3BvcnRdIDogcG9ydDtcbiAgICB0aGlzLndyaXRlKHRoaXMuZW5jb2RlTW90b3JBbmdsZShwb3J0TnVtLCBhbmdsZSwgZHV0eUN5Y2xlKSwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIFR1cm4gYm90aCBtb3RvcnMgKEEgYW5kIEIpIGJ5IHNwZWNpZmljIGFuZ2xlXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBhbmdsZSBkZWdyZWVzIHRvIHR1cm4gZnJvbSBgMGAgdG8gYDIxNDc0ODM2NDdgXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkdXR5Q3ljbGVBIG1vdG9yIHBvd2VyIHBlcmNlbnRhZ2UgZnJvbSBgLTEwMGAgdG8gYDEwMGAuIElmIGEgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW5cbiAgICogcm90YXRpb24gaXMgY291bnRlcmNsb2Nrd2lzZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGR1dHlDeWNsZUIgbW90b3IgcG93ZXIgcGVyY2VudGFnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlblxuICAgKiByb3RhdGlvbiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKi9cbiAgbW90b3JBbmdsZU11bHRpKGFuZ2xlOiBudW1iZXIsIGR1dHlDeWNsZUE6IG51bWJlciwgZHV0eUN5Y2xlQjogbnVtYmVyLCBjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcbiAgICB0aGlzLndyaXRlKHRoaXMuZW5jb2RlTW90b3JBbmdsZU11bHRpKHRoaXMucG9ydDJudW1bJ0FCJ10sIGFuZ2xlLCBkdXR5Q3ljbGVBLCBkdXR5Q3ljbGVCKSwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgcmF3IGRhdGFcbiAgICogQHBhcmFtIHtvYmplY3R9IHJhdyByYXcgZGF0YVxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKi9cbiAgcmF3Q29tbWFuZChyYXc6IFJhd0RhdGEsIGNhbGxiYWNrPzogKCkgPT4gdm9pZCkge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBjb25zdCBidWYgPSBCdWZmZXIuZnJvbShbMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMF0pO1xuXG4gICAgZm9yIChjb25zdCBpZHggaW4gcmF3KSB7XG4gICAgICBidWYud3JpdGVJbnRMRShyYXdbaWR4XSwgaWR4KTtcbiAgICB9XG5cbiAgICB0aGlzLndyaXRlKGJ1ZiwgY2FsbGJhY2spO1xuICB9XG5cbiAgbW90b3JQb3dlckNvbW1hbmQocG9ydDogYW55LCBwb3dlcjogbnVtYmVyKSB7XG4gICAgdGhpcy53cml0ZSh0aGlzLmVuY29kZU1vdG9yUG93ZXIocG9ydCwgcG93ZXIpKTtcbiAgfVxuXG4gIC8vWzB4MDksIDB4MDAsIDB4ODEsIDB4MzksIDB4MTEsIDB4MDcsIDB4MDAsIDB4NjQsIDB4MDNdXG4gIGVuY29kZU1vdG9yUG93ZXIocG9ydDogc3RyaW5nIHwgbnVtYmVyLCBkdXR5Q3ljbGUgPSAxMDApIHtcbiAgICBjb25zdCBwb3J0TnVtID0gdHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnID8gdGhpcy5wb3J0Mm51bVtwb3J0XSA6IHBvcnQ7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKFsweDA5LCAweDAwLCAweDgxLCBwb3J0TnVtLCAweDExLCAweDA3LCAweDAwLCAweDY0LCAweDAzXSk7XG4gICAgLy9idWYud3JpdGVVSW50MTZMRShzZWNvbmRzICogMTAwMCwgNik7XG4gICAgYnVmLndyaXRlSW50OChkdXR5Q3ljbGUsIDYpO1xuICAgIHJldHVybiBidWY7XG4gIH1cblxuICAvLzB4MEMsIDB4MDAsIDB4ODEsIHBvcnQsIDB4MTEsIDB4MDksIDB4MDAsIDB4MDAsIDB4MDAsIDB4NjQsIDB4N0YsIDB4MDNcblxuICAvKipcbiAgICogQ29udHJvbCB0aGUgTEVEIG9uIHRoZSBNb3ZlIEh1YlxuICAgKiBAbWV0aG9kIEh1YiNsZWRcbiAgICogQHBhcmFtIHtib29sZWFufG51bWJlcnxzdHJpbmd9IGNvbG9yXG4gICAqIElmIHNldCB0byBib29sZWFuIGBmYWxzZWAgdGhlIExFRCBpcyBzd2l0Y2hlZCBvZmYsIGlmIHNldCB0byBgdHJ1ZWAgdGhlIExFRCB3aWxsIGJlIHdoaXRlLlxuICAgKiBQb3NzaWJsZSBzdHJpbmcgdmFsdWVzOiBgb2ZmYCwgYHBpbmtgLCBgcHVycGxlYCwgYGJsdWVgLCBgbGlnaHRibHVlYCwgYGN5YW5gLCBgZ3JlZW5gLCBgeWVsbG93YCwgYG9yYW5nZWAsIGByZWRgLFxuICAgKiBgd2hpdGVgXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja11cbiAgICovXG4gIGxlZChjb2xvcjogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiwgY2FsbGJhY2s/OiAoKSA9PiB2b2lkKSB7XG4gICAgdGhpcy53cml0ZSh0aGlzLmVuY29kZUxlZChjb2xvciksIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgZm9yIHNlbnNvciBub3RpZmljYXRpb25zXG4gICAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcn0gcG9ydCAtIGUuZy4gY2FsbCBgLnN1YnNjcmliZSgnQycpYCBpZiB5b3UgaGF2ZSB5b3VyIGRpc3RhbmNlL2NvbG9yIHNlbnNvciBvbiBwb3J0IEMuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9uPTBdIFVua25vd24gbWVhbmluZy4gTmVlZHMgdG8gYmUgMCBmb3IgZGlzdGFuY2UvY29sb3IsIDIgZm9yIG1vdG9ycywgOCBmb3IgdGlsdFxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdXG4gICAqL1xuICBzdWJzY3JpYmUocG9ydDogc3RyaW5nIHwgbnVtYmVyLCBvcHRpb246IG51bWJlciA9IDAsIGNhbGxiYWNrPzogKCkgPT4gdm9pZCkge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBUT0RPOiBXaHkgd2UgaGF2ZSBmdW5jdGlvbiBjaGVjayBoZXJlP1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb247XG4gICAgICBvcHRpb24gPSAweDAwO1xuICAgIH1cbiAgICBjb25zdCBwb3J0TnVtID0gdHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnID8gdGhpcy5wb3J0Mm51bVtwb3J0XSA6IHBvcnQ7XG4gICAgdGhpcy53cml0ZShcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIEJ1ZmZlci5mcm9tKFsweDBhLCAweDAwLCAweDQxLCBwb3J0TnVtLCBvcHRpb24sIDB4MDEsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDFdKSxcbiAgICAgIGNhbGxiYWNrXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbnN1YnNjcmliZSBmcm9tIHNlbnNvciBub3RpZmljYXRpb25zXG4gICAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcn0gcG9ydFxuICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbj0wXSBVbmtub3duIG1lYW5pbmcuIE5lZWRzIHRvIGJlIDAgZm9yIGRpc3RhbmNlL2NvbG9yLCAyIGZvciBtb3RvcnMsIDggZm9yIHRpbHRcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXVxuICAgKi9cbiAgdW5zdWJzY3JpYmUocG9ydDogc3RyaW5nIHwgbnVtYmVyLCBvcHRpb246IG51bWJlciA9IDAsIGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9uO1xuICAgICAgb3B0aW9uID0gMHgwMDtcbiAgICB9XG4gICAgY29uc3QgcG9ydE51bSA9IHR5cGVvZiBwb3J0ID09PSAnc3RyaW5nJyA/IHRoaXMucG9ydDJudW1bcG9ydF0gOiBwb3J0O1xuICAgIHRoaXMud3JpdGUoXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBCdWZmZXIuZnJvbShbMHgwYSwgMHgwMCwgMHg0MSwgcG9ydE51bSwgb3B0aW9uLCAweDAxLCAweDAwLCAweDAwLCAweDAwLCAweDAwXSksXG4gICAgICBjYWxsYmFja1xuICAgICk7XG4gIH1cblxuICBzdWJzY3JpYmVBbGwoKSB7XG4gICAgT2JqZWN0LmVudHJpZXModGhpcy5wb3J0cykuZm9yRWFjaCgoW3BvcnQsIGRhdGFdKSA9PiB7XG4gICAgICBpZiAoZGF0YS5kZXZpY2VUeXBlID09PSAnRElTVEFOQ0UnKSB7XG4gICAgICAgIHRoaXMuc3Vic2NyaWJlKHBhcnNlSW50KHBvcnQsIDEwKSwgOCk7XG4gICAgICB9IGVsc2UgaWYgKGRhdGEuZGV2aWNlVHlwZSA9PT0gJ1RJTFQnKSB7XG4gICAgICAgIHRoaXMuc3Vic2NyaWJlKHBhcnNlSW50KHBvcnQsIDEwKSwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGRhdGEuZGV2aWNlVHlwZSA9PT0gJ0lNT1RPUicpIHtcbiAgICAgICAgdGhpcy5zdWJzY3JpYmUocGFyc2VJbnQocG9ydCwgMTApLCAyKTtcbiAgICAgIH0gZWxzZSBpZiAoZGF0YS5kZXZpY2VUeXBlID09PSAnTU9UT1InKSB7XG4gICAgICAgIHRoaXMuc3Vic2NyaWJlKHBhcnNlSW50KHBvcnQsIDEwKSwgMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ0RlYnVnKGBQb3J0IHN1YnNjcmlidGlvbiBub3Qgc2VudDogJHtwb3J0fWApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgZGF0YSBvdmVyIEJMRVxuICAgKiBAbWV0aG9kIEh1YiN3cml0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ3xCdWZmZXJ9IGRhdGEgSWYgYSBzdHJpbmcgaXMgZ2l2ZW4gaXQgaGFzIHRvIGhhdmUgaGV4IGJ5dGVzIHNlcGFyYXRlZCBieSBzcGFjZXMsIGUuZy4gYDBhIDAxIGMzIGIyYFxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKi9cbiAgd3JpdGUoZGF0YTogYW55LCBjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCBhcnIgPSBbXTtcbiAgICAgIGRhdGEuc3BsaXQoJyAnKS5mb3JFYWNoKGMgPT4ge1xuICAgICAgICBhcnIucHVzaChwYXJzZUludChjLCAxNikpO1xuICAgICAgfSk7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBkYXRhID0gQnVmZmVyLmZyb20oYXJyKTtcbiAgICB9XG5cbiAgICAvLyBPcmlnaW5hbCBpbXBsZW1lbnRhdGlvbiBwYXNzZWQgc2Vjb25kQXJnIHRvIGRlZmluZSBpZiByZXNwb25zZSBpcyB3YWl0ZWRcbiAgICB0aGlzLndyaXRlQ3VlLnB1c2goe1xuICAgICAgZGF0YSxcbiAgICAgIHNlY29uZEFyZzogdHJ1ZSxcbiAgICAgIGNhbGxiYWNrLFxuICAgIH0pO1xuXG4gICAgdGhpcy53cml0ZUZyb21DdWUoKTtcbiAgfVxuXG4gIHdyaXRlRnJvbUN1ZSgpIHtcbiAgICBpZiAodGhpcy53cml0ZUN1ZS5sZW5ndGggPT09IDAgfHwgdGhpcy5pc1dyaXRpbmcpIHJldHVybjtcblxuICAgIGNvbnN0IGVsOiBhbnkgPSB0aGlzLndyaXRlQ3VlLnNoaWZ0KCk7XG4gICAgdGhpcy5sb2dEZWJ1ZygnV3JpdGluZyB0byBkZXZpY2UnLCBlbCk7XG4gICAgdGhpcy5pc1dyaXRpbmcgPSB0cnVlO1xuICAgIHRoaXMuYmx1ZXRvb3RoXG4gICAgICAud3JpdGVWYWx1ZShlbC5kYXRhKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICB0aGlzLmlzV3JpdGluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodHlwZW9mIGVsLmNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSBlbC5jYWxsYmFjaygpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICB0aGlzLmlzV3JpdGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmxvZyhgRXJyb3Igd2hpbGUgd3JpdGluZzogJHtlbC5kYXRhfSAtIEVycm9yICR7ZXJyLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgIC8vIFRPRE86IE5vdGlmeSBvZiBmYWlsdXJlXG4gICAgICB9KVxuICAgICAgLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlRnJvbUN1ZSgpO1xuICAgICAgfSk7XG4gIH1cblxuICBlbmNvZGVNb3RvclRpbWVNdWx0aShwb3J0OiBudW1iZXIsIHNlY29uZHM6IG51bWJlciwgZHV0eUN5Y2xlQSA9IDEwMCwgZHV0eUN5Y2xlQiA9IC0xMDApIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oWzB4MGQsIDB4MDAsIDB4ODEsIHBvcnQsIDB4MTEsIDB4MGEsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4NjQsIDB4N2YsIDB4MDNdKTtcbiAgICBidWYud3JpdGVVSW50MTZMRShzZWNvbmRzICogMTAwMCwgNik7XG4gICAgYnVmLndyaXRlSW50OChkdXR5Q3ljbGVBLCA4KTtcbiAgICBidWYud3JpdGVJbnQ4KGR1dHlDeWNsZUIsIDkpO1xuICAgIHJldHVybiBidWY7XG4gIH1cblxuICBlbmNvZGVNb3RvclRpbWUocG9ydDogbnVtYmVyLCBzZWNvbmRzOiBudW1iZXIsIGR1dHlDeWNsZSA9IDEwMCkge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBjb25zdCBidWYgPSBCdWZmZXIuZnJvbShbMHgwYywgMHgwMCwgMHg4MSwgcG9ydCwgMHgxMSwgMHgwOSwgMHgwMCwgMHgwMCwgMHgwMCwgMHg2NCwgMHg3ZiwgMHgwM10pO1xuICAgIGJ1Zi53cml0ZVVJbnQxNkxFKHNlY29uZHMgKiAxMDAwLCA2KTtcbiAgICBidWYud3JpdGVJbnQ4KGR1dHlDeWNsZSwgOCk7XG4gICAgcmV0dXJuIGJ1ZjtcbiAgfVxuXG4gIGVuY29kZU1vdG9yQW5nbGVNdWx0aShwb3J0OiBudW1iZXIsIGFuZ2xlOiBudW1iZXIsIGR1dHlDeWNsZUEgPSAxMDAsIGR1dHlDeWNsZUIgPSAtMTAwKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKFsweDBmLCAweDAwLCAweDgxLCBwb3J0LCAweDExLCAweDBjLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDY0LCAweDdmLCAweDAzXSk7XG4gICAgYnVmLndyaXRlVUludDMyTEUoYW5nbGUsIDYpO1xuICAgIGJ1Zi53cml0ZUludDgoZHV0eUN5Y2xlQSwgMTApO1xuICAgIGJ1Zi53cml0ZUludDgoZHV0eUN5Y2xlQiwgMTEpO1xuICAgIHJldHVybiBidWY7XG4gIH1cblxuICBlbmNvZGVNb3RvckFuZ2xlKHBvcnQ6IG51bWJlciwgYW5nbGU6IG51bWJlciwgZHV0eUN5Y2xlID0gMTAwKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKFsweDBlLCAweDAwLCAweDgxLCBwb3J0LCAweDExLCAweDBiLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDY0LCAweDdmLCAweDAzXSk7XG4gICAgYnVmLndyaXRlVUludDMyTEUoYW5nbGUsIDYpO1xuICAgIGJ1Zi53cml0ZUludDgoZHV0eUN5Y2xlLCAxMCk7XG4gICAgcmV0dXJuIGJ1ZjtcbiAgfVxuXG4gIGVuY29kZUxlZChjb2xvcjogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbikge1xuICAgIGlmICh0eXBlb2YgY29sb3IgPT09ICdib29sZWFuJykge1xuICAgICAgY29sb3IgPSBjb2xvciA/ICd3aGl0ZScgOiAnb2ZmJztcbiAgICB9XG4gICAgY29uc3QgY29sb3JOdW0gPSB0eXBlb2YgY29sb3IgPT09ICdzdHJpbmcnID8gdGhpcy5sZWRDb2xvcnMuaW5kZXhPZihjb2xvciBhcyBMZWRDb2xvcikgOiBjb2xvcjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKFsweDA4LCAweDAwLCAweDgxLCAweDMyLCAweDExLCAweDUxLCAweDAwLCBjb2xvck51bV0pO1xuICB9XG59XG4iLCJpbXBvcnQgeyBIdWIgfSBmcm9tICcuL2h1Yic7XG5pbXBvcnQgeyBNb3RvciB9IGZyb20gJy4uL3R5cGVzJ1xuXG5jb25zdCBDQUxMQkFDS19USU1FT1VUX01TID0gMTAwMCAvIDM7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX0NPTkZJRyA9IHtcbiAgTUVUUklDX01PRElGSUVSOiAyOC41LFxuICBUVVJOX01PRElGSUVSOiAyLjU2LFxuICBEUklWRV9TUEVFRDogMjUsXG4gIFRVUk5fU1BFRUQ6IDIwLFxuICBERUZBVUxUX1NUT1BfRElTVEFOQ0U6IDEwNSxcbiAgREVGQVVMVF9DTEVBUl9ESVNUQU5DRTogMTIwLFxuICBMRUZUX01PVE9SOiAnQScgYXMgTW90b3IsXG4gIFJJR0hUX01PVE9SOiAnQicgYXMgTW90b3IsXG4gIFZBTElEX01PVE9SUzogWydBJyBhcyBNb3RvciwgJ0InIGFzIE1vdG9yXSxcbn07XG5cbmNvbnN0IHZhbGlkYXRlQ29uZmlndXJhdGlvbiA9IChjb25maWd1cmF0aW9uOiBCb29zdENvbmZpZ3VyYXRpb24pID0+IHtcbiAgY29uZmlndXJhdGlvbi5sZWZ0TW90b3IgPSBjb25maWd1cmF0aW9uLmxlZnRNb3RvciB8fCBERUZBVUxUX0NPTkZJRy5MRUZUX01PVE9SO1xuICBjb25maWd1cmF0aW9uLnJpZ2h0TW90b3IgPSBjb25maWd1cmF0aW9uLnJpZ2h0TW90b3IgfHwgREVGQVVMVF9DT05GSUcuUklHSFRfTU9UT1I7XG5cbiAgLy8gQHRzLWlnbm9yZVxuICBpZiAoIURFRkFVTFRfQ09ORklHLlZBTElEX01PVE9SUy5pbmNsdWRlcyhjb25maWd1cmF0aW9uLmxlZnRNb3RvcikpIHRocm93IEVycm9yKCdEZWZpbmUgbGVmdCBwb3J0IHBvcnQgY29ycmVjdGx5Jyk7XG5cbiAgLy8gQHRzLWlnbm9yZVxuICBpZiAoIURFRkFVTFRfQ09ORklHLlZBTElEX01PVE9SUy5pbmNsdWRlcyhjb25maWd1cmF0aW9uLnJpZ2h0TW90b3IpKSB0aHJvdyBFcnJvcignRGVmaW5lIHJpZ2h0IHBvcnQgcG9ydCBjb3JyZWN0bHknKTtcblxuICBpZiAoY29uZmlndXJhdGlvbi5sZWZ0TW90b3IgPT09IGNvbmZpZ3VyYXRpb24ucmlnaHRNb3RvcikgdGhyb3cgRXJyb3IoJ0xlZnQgYW5kIHJpZ2h0IG1vdG9yIGNhbiBub3QgYmUgc2FtZScpO1xuXG4gIGNvbmZpZ3VyYXRpb24uZGlzdGFuY2VNb2RpZmllciA9IGNvbmZpZ3VyYXRpb24uZGlzdGFuY2VNb2RpZmllciB8fCBERUZBVUxUX0NPTkZJRy5NRVRSSUNfTU9ESUZJRVI7XG4gIGNvbmZpZ3VyYXRpb24udHVybk1vZGlmaWVyID0gY29uZmlndXJhdGlvbi50dXJuTW9kaWZpZXIgfHwgREVGQVVMVF9DT05GSUcuVFVSTl9NT0RJRklFUjtcbiAgY29uZmlndXJhdGlvbi5kcml2ZVNwZWVkID0gY29uZmlndXJhdGlvbi5kcml2ZVNwZWVkIHx8IERFRkFVTFRfQ09ORklHLkRSSVZFX1NQRUVEO1xuICBjb25maWd1cmF0aW9uLnR1cm5TcGVlZCA9IGNvbmZpZ3VyYXRpb24udHVyblNwZWVkIHx8IERFRkFVTFRfQ09ORklHLlRVUk5fU1BFRUQ7XG4gIGNvbmZpZ3VyYXRpb24uZGVmYXVsdFN0b3BEaXN0YW5jZSA9IGNvbmZpZ3VyYXRpb24uZGVmYXVsdFN0b3BEaXN0YW5jZSB8fCBERUZBVUxUX0NPTkZJRy5ERUZBVUxUX1NUT1BfRElTVEFOQ0U7XG4gIGNvbmZpZ3VyYXRpb24uZGVmYXVsdENsZWFyRGlzdGFuY2UgPSBjb25maWd1cmF0aW9uLmRlZmF1bHRDbGVhckRpc3RhbmNlIHx8IERFRkFVTFRfQ09ORklHLkRFRkFVTFRfQ0xFQVJfRElTVEFOQ0U7XG59O1xuXG5jb25zdCB3YWl0Rm9yVmFsdWVUb1NldCA9IGZ1bmN0aW9uKFxuICB2YWx1ZU5hbWUsXG4gIGNvbXBhcmVGdW5jID0gdmFsdWVOYW1lVG9Db21wYXJlID0+IHRoaXNbdmFsdWVOYW1lVG9Db21wYXJlXSxcbiAgdGltZW91dE1zID0gMFxuKSB7XG4gIGlmIChjb21wYXJlRnVuYy5iaW5kKHRoaXMpKHZhbHVlTmFtZSkpIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpc1t2YWx1ZU5hbWVdKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHNldFRpbWVvdXQoXG4gICAgICBhc3luYyAoKSA9PiByZXNvbHZlKGF3YWl0IHdhaXRGb3JWYWx1ZVRvU2V0LmJpbmQodGhpcykodmFsdWVOYW1lLCBjb21wYXJlRnVuYywgdGltZW91dE1zKSksXG4gICAgICB0aW1lb3V0TXMgKyAxMDBcbiAgICApO1xuICB9KTtcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9vc3RDb25maWd1cmF0aW9uIHtcbiAgZGlzdGFuY2VNb2RpZmllcj86IGFueTtcbiAgdHVybk1vZGlmaWVyPzogYW55O1xuICBkZWZhdWx0Q2xlYXJEaXN0YW5jZT86IGFueTtcbiAgZGVmYXVsdFN0b3BEaXN0YW5jZT86IGFueTtcbiAgbGVmdE1vdG9yPzogTW90b3I7XG4gIHJpZ2h0TW90b3I/OiBNb3RvcjtcbiAgZHJpdmVTcGVlZD86IG51bWJlcjtcbiAgdHVyblNwZWVkPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgSHViQXN5bmMgZXh0ZW5kcyBIdWIge1xuICBodWJEaXNjb25uZWN0ZWQ6IGJvb2xlYW47XG4gIGNvbmZpZ3VyYXRpb246IEJvb3N0Q29uZmlndXJhdGlvbjtcbiAgcG9ydERhdGE6IGFueTtcbiAgdXNlTWV0cmljOiBib29sZWFuO1xuICBtb2RpZmllcjogbnVtYmVyO1xuICBkaXN0YW5jZTogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGJsdWV0b290aDogQmx1ZXRvb3RoUmVtb3RlR0FUVENoYXJhY3RlcmlzdGljLCBjb25maWd1cmF0aW9uOiBCb29zdENvbmZpZ3VyYXRpb24pIHtcbiAgICBzdXBlcihibHVldG9vdGgpO1xuICAgIHZhbGlkYXRlQ29uZmlndXJhdGlvbihjb25maWd1cmF0aW9uKTtcbiAgICB0aGlzLmNvbmZpZ3VyYXRpb24gPSBjb25maWd1cmF0aW9uO1xuICB9XG4gIC8qKlxuICAgKiBEaXNjb25uZWN0IEh1YlxuICAgKiBAbWV0aG9kIEh1YiNkaXNjb25uZWN0QXN5bmNcbiAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59IGRpc2Nvbm5lY3Rpb24gc3VjY2Vzc2Z1bFxuICAgKi9cbiAgZGlzY29ubmVjdEFzeW5jKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRoaXMuc2V0RGlzY29ubmVjdGVkKCk7XG4gICAgcmV0dXJuIHdhaXRGb3JWYWx1ZVRvU2V0LmJpbmQodGhpcykoJ2h1YkRpc2Nvbm5lY3RlZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgdGhpcyBtZXRob2QgYWZ0ZXIgbmV3IGluc3RhbmNlIG9mIEh1YiBpcyBjcmVhdGVkXG4gICAqIEBtZXRob2QgSHViI2FmdGVySW5pdGlhbGl6YXRpb25cbiAgICovXG4gIGFmdGVySW5pdGlhbGl6YXRpb24oKSB7XG4gICAgdGhpcy5odWJEaXNjb25uZWN0ZWQgPSBudWxsO1xuICAgIHRoaXMucG9ydERhdGEgPSB7XG4gICAgICBBOiB7IGFuZ2xlOiAwIH0sXG4gICAgICBCOiB7IGFuZ2xlOiAwIH0sXG4gICAgICBBQjogeyBhbmdsZTogMCB9LFxuICAgICAgQzogeyBhbmdsZTogMCB9LFxuICAgICAgRDogeyBhbmdsZTogMCB9LFxuICAgICAgTEVEOiB7IGFuZ2xlOiAwIH0sXG4gICAgfTtcbiAgICB0aGlzLnVzZU1ldHJpYyA9IHRydWU7XG4gICAgdGhpcy5tb2RpZmllciA9IDE7XG5cbiAgICB0aGlzLmVtaXR0ZXIub24oJ3JvdGF0aW9uJywgcm90YXRpb24gPT4gKHRoaXMucG9ydERhdGFbcm90YXRpb24ucG9ydF0uYW5nbGUgPSByb3RhdGlvbi5hbmdsZSkpO1xuICAgIHRoaXMuZW1pdHRlci5vbignZGlzY29ubmVjdCcsICgpID0+ICh0aGlzLmh1YkRpc2Nvbm5lY3RlZCA9IHRydWUpKTtcbiAgICB0aGlzLmVtaXR0ZXIub24oJ2Rpc3RhbmNlJywgZGlzdGFuY2UgPT4gKHRoaXMuZGlzdGFuY2UgPSBkaXN0YW5jZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnRyb2wgdGhlIExFRCBvbiB0aGUgTW92ZSBIdWJcbiAgICogQG1ldGhvZCBIdWIjbGVkQXN5bmNcbiAgICogQHBhcmFtIHtib29sZWFufG51bWJlcnxzdHJpbmd9IGNvbG9yXG4gICAqIElmIHNldCB0byBib29sZWFuIGBmYWxzZWAgdGhlIExFRCBpcyBzd2l0Y2hlZCBvZmYsIGlmIHNldCB0byBgdHJ1ZWAgdGhlIExFRCB3aWxsIGJlIHdoaXRlLlxuICAgKiBQb3NzaWJsZSBzdHJpbmcgdmFsdWVzOiBgb2ZmYCwgYHBpbmtgLCBgcHVycGxlYCwgYGJsdWVgLCBgbGlnaHRibHVlYCwgYGN5YW5gLCBgZ3JlZW5gLCBgeWVsbG93YCwgYG9yYW5nZWAsIGByZWRgLFxuICAgKiBgd2hpdGVgXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgbGVkQXN5bmMoY29sb3I6IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLmxlZChjb2xvciwgKCkgPT4ge1xuICAgICAgICAvLyBDYWxsYmFjayBpcyBleGVjdXRlZCB3aGVuIGNvbW1hbmQgaXMgc2VudCBhbmQgaXQgd2lsbCB0YWtlIHNvbWUgdGltZSBiZWZvcmUgTW92ZUh1YiBleGVjdXRlcyB0aGUgY29tbWFuZFxuICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmUsIENBTExCQUNLX1RJTUVPVVRfTVMpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUnVuIGEgbW90b3IgZm9yIHNwZWNpZmljIHRpbWVcbiAgICogQG1ldGhvZCBIdWIjbW90b3JUaW1lQXN5bmNcbiAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBwb3J0IHBvc3NpYmxlIHN0cmluZyB2YWx1ZXM6IGBBYCwgYEJgLCBgQUJgLCBgQ2AsIGBEYC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHNcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkdXR5Q3ljbGU9MTAwXSBtb3RvciBwb3dlciBwZXJjZW50c2FnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiByb3RhdGlvblxuICAgKiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PWZhbHNlXSB3aWxsIHByb21pc2Ugd2FpdCB1bml0bGwgbW90b3JUaW1lIHJ1biB0aW1lIGhhcyBlbGFwc2VkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgbW90b3JUaW1lQXN5bmMocG9ydDogc3RyaW5nIHwgbnVtYmVyLCBzZWNvbmRzOiBudW1iZXIsIGR1dHlDeWNsZTogbnVtYmVyID0gMTAwLCB3YWl0OiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgXykgPT4ge1xuICAgICAgdGhpcy5tb3RvclRpbWUocG9ydCwgc2Vjb25kcywgZHV0eUN5Y2xlLCAoKSA9PiB7XG4gICAgICAgIHNldFRpbWVvdXQocmVzb2x2ZSwgd2FpdCA/IENBTExCQUNLX1RJTUVPVVRfTVMgKyBzZWNvbmRzICogMTAwMCA6IENBTExCQUNLX1RJTUVPVVRfTVMpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUnVuIGJvdGggbW90b3JzIChBIGFuZCBCKSBmb3Igc3BlY2lmaWMgdGltZVxuICAgKiBAbWV0aG9kIEh1YiNtb3RvclRpbWVNdWx0aUFzeW5jXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZHV0eUN5Y2xlQT0xMDBdIG1vdG9yIHBvd2VyIHBlcmNlbnRhZ2UgZnJvbSBgLTEwMGAgdG8gYDEwMGAuIElmIGEgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4gcm90YXRpb25cbiAgICogaXMgY291bnRlcmNsb2Nrd2lzZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkdXR5Q3ljbGVCPTEwMF0gbW90b3IgcG93ZXIgcGVyY2VudGFnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiByb3RhdGlvblxuICAgKiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PWZhbHNlXSB3aWxsIHByb21pc2Ugd2FpdCB1bml0bGwgbW90b3JUaW1lIHJ1biB0aW1lIGhhcyBlbGFwc2VkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgbW90b3JUaW1lTXVsdGlBc3luYyhzZWNvbmRzOiBudW1iZXIsIGR1dHlDeWNsZUE6IG51bWJlciA9IDEwMCwgZHV0eUN5Y2xlQjogbnVtYmVyID0gMTAwLCB3YWl0OiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgXykgPT4ge1xuICAgICAgdGhpcy5tb3RvclRpbWVNdWx0aShzZWNvbmRzLCBkdXR5Q3ljbGVBLCBkdXR5Q3ljbGVCLCAoKSA9PiB7XG4gICAgICAgIHNldFRpbWVvdXQocmVzb2x2ZSwgd2FpdCA/IENBTExCQUNLX1RJTUVPVVRfTVMgKyBzZWNvbmRzICogMTAwMCA6IENBTExCQUNLX1RJTUVPVVRfTVMpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVHVybiBhIG1vdG9yIGJ5IHNwZWNpZmljIGFuZ2xlXG4gICAqIEBtZXRob2QgSHViI21vdG9yQW5nbGVBc3luY1xuICAgKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ9IHBvcnQgcG9zc2libGUgc3RyaW5nIHZhbHVlczogYEFgLCBgQmAsIGBBQmAsIGBDYCwgYERgLlxuICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGUgLSBkZWdyZWVzIHRvIHR1cm4gZnJvbSBgMGAgdG8gYDIxNDc0ODM2NDdgXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZHV0eUN5Y2xlPTEwMF0gbW90b3IgcG93ZXIgcGVyY2VudGFnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlblxuICAgKiByb3RhdGlvbiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PWZhbHNlXSB3aWxsIHByb21pc2Ugd2FpdCB1bml0bGwgbW90b3JBbmdsZSBoYXMgdHVybmVkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgbW90b3JBbmdsZUFzeW5jKHBvcnQ6IHN0cmluZyB8IG51bWJlciwgYW5nbGU6IG51bWJlciwgZHV0eUN5Y2xlOiBudW1iZXIgPSAxMDAsIHdhaXQ6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCBfKSA9PiB7XG4gICAgICB0aGlzLm1vdG9yQW5nbGUocG9ydCwgYW5nbGUsIGR1dHlDeWNsZSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAod2FpdCkge1xuICAgICAgICAgIGxldCBiZWZvcmVUdXJuO1xuICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgIGJlZm9yZVR1cm4gPSB0aGlzLnBvcnREYXRhW3BvcnRdLmFuZ2xlO1xuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBDQUxMQkFDS19USU1FT1VUX01TKSk7XG4gICAgICAgICAgfSB3aGlsZSAodGhpcy5wb3J0RGF0YVtwb3J0XS5hbmdsZSAhPT0gYmVmb3JlVHVybik7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNldFRpbWVvdXQocmVzb2x2ZSwgQ0FMTEJBQ0tfVElNRU9VVF9NUyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFR1cm4gYm90aCBtb3RvcnMgKEEgYW5kIEIpIGJ5IHNwZWNpZmljIGFuZ2xlXG4gICAqIEBtZXRob2QgSHViI21vdG9yQW5nbGVNdWx0aUFzeW5jXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBhbmdsZSBkZWdyZWVzIHRvIHR1cm4gZnJvbSBgMGAgdG8gYDIxNDc0ODM2NDdgXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZHV0eUN5Y2xlQT0xMDBdIG1vdG9yIHBvd2VyIHBlcmNlbnRhZ2UgZnJvbSBgLTEwMGAgdG8gYDEwMGAuIElmIGEgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW5cbiAgICogcm90YXRpb24gaXMgY291bnRlcmNsb2Nrd2lzZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkdXR5Q3ljbGVCPTEwMF0gbW90b3IgcG93ZXIgcGVyY2VudGFnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlblxuICAgKiByb3RhdGlvbiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PWZhbHNlXSB3aWxsIHByb21pc2Ugd2FpdCB1bml0bGwgbW90b3JBbmdsZSBoYXMgdHVybmVkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi8gXG4gIG1vdG9yQW5nbGVNdWx0aUFzeW5jKGFuZ2xlOiBudW1iZXIsIGR1dHlDeWNsZUE6IG51bWJlciA9IDEwMCwgZHV0eUN5Y2xlQjogbnVtYmVyID0gMTAwLCB3YWl0OiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgXykgPT4ge1xuICAgICAgdGhpcy5tb3RvckFuZ2xlTXVsdGkoYW5nbGUsIGR1dHlDeWNsZUEsIGR1dHlDeWNsZUIsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaWYgKHdhaXQpIHtcbiAgICAgICAgICBsZXQgYmVmb3JlVHVybjtcblxuICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgIGJlZm9yZVR1cm4gPSB0aGlzLnBvcnREYXRhWydBJ10uYW5nbGU7ICAgICAgICAgICAgXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIENBTExCQUNLX1RJTUVPVVRfTVMpKTsgICAgICAgICAgICBcbiAgICAgICAgICB9IHdoaWxlICh0aGlzLnBvcnREYXRhWydBJ10uYW5nbGUgIT09IGJlZm9yZVR1cm4pO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmUsIENBTExCQUNLX1RJTUVPVVRfTVMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2UgbWV0cmljIHVuaXRzIChkZWZhdWx0KVxuICAgKiBAbWV0aG9kIEh1YiN1c2VNZXRyaWNVbml0c1xuICAgKi9cbiAgdXNlTWV0cmljVW5pdHMoKSB7XG4gICAgdGhpcy51c2VNZXRyaWMgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFVzZSBpbXBlcmlhbCB1bml0c1xuICAgKiBAbWV0aG9kIEh1YiN1c2VJbXBlcmlhbFVuaXRzXG4gICAqL1xuICB1c2VJbXBlcmlhbFVuaXRzKCkge1xuICAgIHRoaXMudXNlTWV0cmljID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogU2V0IGZyaWN0aW9uIG1vZGlmaWVyXG4gICAqIEBtZXRob2QgSHViI3NldEZyaWN0aW9uTW9kaWZpZXJcbiAgICogQHBhcmFtIHtudW1iZXJ9IG1vZGlmaWVyIGZyaWN0aW9uIG1vZGlmaWVyXG4gICAqL1xuICBzZXRGcmljdGlvbk1vZGlmaWVyKG1vZGlmaWVyOiBudW1iZXIpIHtcbiAgICB0aGlzLm1vZGlmaWVyID0gbW9kaWZpZXI7XG4gIH1cblxuICAvKipcbiAgICogRHJpdmUgc3BlY2lmaWVkIGRpc3RhbmNlXG4gICAqIEBtZXRob2QgSHViI2RyaXZlXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkaXN0YW5jZSBkaXN0YW5jZSBpbiBjZW50aW1ldGVycyAoZGVmYXVsdCkgb3IgaW5jaGVzLiBQb3NpdGl2ZSBpcyBmb3J3YXJkIGFuZCBuZWdhdGl2ZSBpcyBiYWNrd2FyZC5cbiAgICogQHBhcmFtIHtib29sZWFufSBbd2FpdD10cnVlXSB3aWxsIHByb21pc2Ugd2FpdCB1bnRpbGwgdGhlIGRyaXZlIGhhcyBjb21wbGV0ZWQuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgZHJpdmUoZGlzdGFuY2U6IG51bWJlciwgd2FpdDogYm9vbGVhbiA9IHRydWUpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGFuZ2xlID1cbiAgICAgIE1hdGguYWJzKGRpc3RhbmNlKSAqXG4gICAgICAoKHRoaXMudXNlTWV0cmljID8gdGhpcy5jb25maWd1cmF0aW9uLmRpc3RhbmNlTW9kaWZpZXIgOiB0aGlzLmNvbmZpZ3VyYXRpb24uZGlzdGFuY2VNb2RpZmllciAvIDQpICpcbiAgICAgICAgdGhpcy5tb2RpZmllcik7XG4gICAgY29uc3QgZHV0eUN5Y2xlQSA9XG4gICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uZHJpdmVTcGVlZCAqIChkaXN0YW5jZSA+IDAgPyAxIDogLTEpICogKHRoaXMuY29uZmlndXJhdGlvbi5sZWZ0TW90b3IgPT09ICdBJyA/IDEgOiAtMSk7XG4gICAgY29uc3QgZHV0eUN5Y2xlQiA9XG4gICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uZHJpdmVTcGVlZCAqIChkaXN0YW5jZSA+IDAgPyAxIDogLTEpICogKHRoaXMuY29uZmlndXJhdGlvbi5sZWZ0TW90b3IgPT09ICdBJyA/IDEgOiAtMSk7XG4gICAgcmV0dXJuIHRoaXMubW90b3JBbmdsZU11bHRpQXN5bmMoYW5nbGUsIGR1dHlDeWNsZUEsIGR1dHlDeWNsZUIsIHdhaXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFR1cm4gcm9ib3Qgc3BlY2lmaWVkIGRlZ3JlZXNcbiAgICogQG1ldGhvZCBIdWIjdHVyblxuICAgKiBAcGFyYW0ge251bWJlcn0gZGVncmVlcyBkZWdyZWVzIHRvMy4gTmVnYXRpdmUgaXMgdG8gdGhlIGxlZnQgYW5kIHBvc2l0aXZlIHRvIHRoZSByaWdodC5cbiAgICogQHBhcmFtIHtib29sZWFufSBbd2FpdD10cnVlXSB3aWxsIHByb21pc2Ugd2FpdCB1bnRpbGwgdGhlIHR1cm4gaGFzIGNvbXBsZXRlZC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICB0dXJuKGRlZ3JlZXM6IG51bWJlciwgd2FpdDogYm9vbGVhbiA9IHRydWUpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGFuZ2xlID0gTWF0aC5hYnMoZGVncmVlcykgKiB0aGlzLmNvbmZpZ3VyYXRpb24udHVybk1vZGlmaWVyO1xuICAgIGNvbnN0IHR1cm5Nb3Rvck1vZGlmaWVyID0gdGhpcy5jb25maWd1cmF0aW9uLmxlZnRNb3RvciA9PT0gJ0EnID8gMSA6IC0xO1xuICAgIGNvbnN0IGxlZnRUdXJuID0gdGhpcy5jb25maWd1cmF0aW9uLnR1cm5TcGVlZCAqIChkZWdyZWVzID4gMCA/IDEgOiAtMSkgKiB0dXJuTW90b3JNb2RpZmllcjtcbiAgICBjb25zdCByaWdodFR1cm4gPSB0aGlzLmNvbmZpZ3VyYXRpb24udHVyblNwZWVkICogKGRlZ3JlZXMgPiAwID8gLTEgOiAxKSAqIHR1cm5Nb3Rvck1vZGlmaWVyO1xuICAgIGNvbnN0IGR1dHlDeWNsZUEgPSB0aGlzLmNvbmZpZ3VyYXRpb24ubGVmdE1vdG9yID09PSAnQScgPyBsZWZ0VHVybiA6IHJpZ2h0VHVybjtcbiAgICBjb25zdCBkdXR5Q3ljbGVCID0gdGhpcy5jb25maWd1cmF0aW9uLmxlZnRNb3RvciA9PT0gJ0EnID8gcmlnaHRUdXJuIDogbGVmdFR1cm47XG4gICAgcmV0dXJuIHRoaXMubW90b3JBbmdsZU11bHRpQXN5bmMoYW5nbGUsIGR1dHlDeWNsZUEsIGR1dHlDeWNsZUIsIHdhaXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIERyaXZlIHVudGlsbCBzZW5zb3Igc2hvd3Mgb2JqZWN0IGluIGRlZmluZWQgZGlzdGFuY2VcbiAgICogQG1ldGhvZCBIdWIjZHJpdmVVbnRpbFxuICAgKiBAcGFyYW0ge251bWJlcn0gW2Rpc3RhbmNlPTBdIGRpc3RhbmNlIGluIGNlbnRpbWV0ZXJzIChkZWZhdWx0KSBvciBpbmNoZXMgd2hlbiB0byBzdG9wLiBEaXN0YW5jZSBzZW5zb3IgaXMgbm90IHZlcnkgc2Vuc2l0aXZlIG9yIGFjY3VyYXRlLlxuICAgKiBCeSBkZWZhdWx0IHdpbGwgc3RvcCB3aGVuIHNlbnNvciBub3RpY2VzIHdhbGwgZm9yIHRoZSBmaXJzdCB0aW1lLiBTZW5zb3IgZGlzdGFuY2UgdmFsdWVzIGFyZSB1c3VhbHkgYmV0d2VlbiAxMTAtNTAuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3dhaXQ9dHJ1ZV0gd2lsbCBwcm9taXNlIHdhaXQgdW50aWxsIHRoZSBib3Qgd2lsbCBzdG9wLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGFzeW5jIGRyaXZlVW50aWwoZGlzdGFuY2U6IG51bWJlciA9IDAsIHdhaXQ6IGJvb2xlYW4gPSB0cnVlKTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBkaXN0YW5jZUNoZWNrID1cbiAgICAgIGRpc3RhbmNlICE9PSAwID8gKHRoaXMudXNlTWV0cmljID8gZGlzdGFuY2UgOiBkaXN0YW5jZSAqIDIuNTQpIDogdGhpcy5jb25maWd1cmF0aW9uLmRlZmF1bHRTdG9wRGlzdGFuY2U7XG4gICAgY29uc3QgZGlyZWN0aW9uID0gdGhpcy5jb25maWd1cmF0aW9uLmxlZnRNb3RvciA9PT0gJ0EnID8gMSA6IC0xO1xuICAgIGNvbnN0IGNvbXBhcmVGdW5jID0gZGlyZWN0aW9uID09PSAxID8gKCkgPT4gZGlzdGFuY2VDaGVjayA+PSB0aGlzLmRpc3RhbmNlIDogKCkgPT4gZGlzdGFuY2VDaGVjayA8PSB0aGlzLmRpc3RhbmNlO1xuICAgIHRoaXMubW90b3JUaW1lTXVsdGkoNjAsIHRoaXMuY29uZmlndXJhdGlvbi5kcml2ZVNwZWVkICogZGlyZWN0aW9uLCB0aGlzLmNvbmZpZ3VyYXRpb24uZHJpdmVTcGVlZCAqIGRpcmVjdGlvbik7XG4gICAgaWYgKHdhaXQpIHtcbiAgICAgIGF3YWl0IHdhaXRGb3JWYWx1ZVRvU2V0LmJpbmQodGhpcykoJ2Rpc3RhbmNlJywgY29tcGFyZUZ1bmMpO1xuICAgICAgYXdhaXQgdGhpcy5tb3RvckFuZ2xlTXVsdGlBc3luYygwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHdhaXRGb3JWYWx1ZVRvU2V0XG4gICAgICAgIC5iaW5kKHRoaXMpKCdkaXN0YW5jZScsIGNvbXBhcmVGdW5jKVxuICAgICAgICAudGhlbihfID0+IHRoaXMubW90b3JBbmdsZU11bHRpKDAsIDAsIDApKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVHVybiB1bnRpbCB0aGVyZSBpcyBubyBvYmplY3QgaW4gc2Vuc29ycyBzaWdodFxuICAgKiBAbWV0aG9kIEh1YiN0dXJuVW50aWxcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkaXJlY3Rpb249MV0gZGlyZWN0aW9uIHRvIHR1cm4gdG8uIDEgKG9yIGFueSBwb3NpdGl2ZSkgaXMgdG8gdGhlIHJpZ2h0IGFuZCAwIChvciBhbnkgbmVnYXRpdmUpIGlzIHRvIHRoZSBsZWZ0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PXRydWVdIHdpbGwgcHJvbWlzZSB3YWl0IHVudGlsbCB0aGUgYm90IHdpbGwgc3RvcC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyB0dXJuVW50aWwoZGlyZWN0aW9uOiBudW1iZXIgPSAxLCB3YWl0OiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgZGlyZWN0aW9uTW9kaWZpZXIgPSBkaXJlY3Rpb24gPiAwID8gMSA6IC0xO1xuICAgIHRoaXMudHVybigzNjAgKiBkaXJlY3Rpb25Nb2RpZmllciwgZmFsc2UpO1xuICAgIGlmICh3YWl0KSB7XG4gICAgICBhd2FpdCB3YWl0Rm9yVmFsdWVUb1NldC5iaW5kKHRoaXMpKCdkaXN0YW5jZScsICgpID0+IHRoaXMuZGlzdGFuY2UgPj0gdGhpcy5jb25maWd1cmF0aW9uLmRlZmF1bHRDbGVhckRpc3RhbmNlKTtcbiAgICAgIGF3YWl0IHRoaXMudHVybigwLCBmYWxzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB3YWl0Rm9yVmFsdWVUb1NldFxuICAgICAgICAuYmluZCh0aGlzKSgnZGlzdGFuY2UnLCAoKSA9PiB0aGlzLmRpc3RhbmNlID49IHRoaXMuY29uZmlndXJhdGlvbi5kZWZhdWx0Q2xlYXJEaXN0YW5jZSlcbiAgICAgICAgLnRoZW4oXyA9PiB0aGlzLnR1cm4oMCwgZmFsc2UpKTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVDb25maWd1cmF0aW9uKGNvbmZpZ3VyYXRpb246IEJvb3N0Q29uZmlndXJhdGlvbik6IHZvaWQge1xuICAgIHZhbGlkYXRlQ29uZmlndXJhdGlvbihjb25maWd1cmF0aW9uKTtcbiAgICB0aGlzLmNvbmZpZ3VyYXRpb24gPSBjb25maWd1cmF0aW9uO1xuICB9XG59XG4iLCJpbXBvcnQgeyBCb29zdENvbm5lY3RvciB9IGZyb20gJy4vYm9vc3RDb25uZWN0b3InO1xuaW1wb3J0IHsgSHViQXN5bmMsIEJvb3N0Q29uZmlndXJhdGlvbiB9IGZyb20gJy4vaHViL2h1YkFzeW5jJztcbmltcG9ydCB7IEh1YkNvbnRyb2wgfSBmcm9tICcuL2FpL2h1Yi1jb250cm9sJztcbmltcG9ydCB7IERldmljZUluZm8sIENvbnRyb2xEYXRhLCBSYXdEYXRhIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExlZ29Cb29zdCB7XG4gIHByaXZhdGUgaHViOiBIdWJBc3luYztcbiAgcHJpdmF0ZSBodWJDb250cm9sOiBIdWJDb250cm9sO1xuICBwcml2YXRlIGNvbG9yOiBzdHJpbmc7XG4gIHByaXZhdGUgdXBkYXRlVGltZXI6IGFueTtcbiAgcHJpdmF0ZSBjb25maWd1cmF0aW9uOiBCb29zdENvbmZpZ3VyYXRpb247XG5cbiAgcHJpdmF0ZSBsb2dEZWJ1ZzogKG1lc3NhZ2U/OiBhbnksIC4uLm9wdGlvbmFsUGFyYW1zOiBhbnlbXSkgPT4gdm9pZCA9IHMgPT4ge307XG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGZyb20gTGVnbyBCb29zdCBtb3RvcnMgYW5kIHNlbnNvcnNcbiAgICogQHByb3BlcnR5IExlZ29Cb29zdCNkZXZpY2VJbmZvXG4gICAqL1xuICBwdWJsaWMgZGV2aWNlSW5mbzogRGV2aWNlSW5mbyA9IHtcbiAgICBwb3J0czoge1xuICAgICAgQTogeyBhY3Rpb246ICcnLCBhbmdsZTogMCB9LFxuICAgICAgQjogeyBhY3Rpb246ICcnLCBhbmdsZTogMCB9LFxuICAgICAgQUI6IHsgYWN0aW9uOiAnJywgYW5nbGU6IDAgfSxcbiAgICAgIEM6IHsgYWN0aW9uOiAnJywgYW5nbGU6IDAgfSxcbiAgICAgIEQ6IHsgYWN0aW9uOiAnJywgYW5nbGU6IDAgfSxcbiAgICAgIExFRDogeyBhY3Rpb246ICcnLCBhbmdsZTogMCB9LFxuICAgIH0sXG4gICAgdGlsdDogeyByb2xsOiAwLCBwaXRjaDogMCB9LFxuICAgIGRpc3RhbmNlOiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUixcbiAgICByc3NpOiAwLFxuICAgIGNvbG9yOiAnJyxcbiAgICBlcnJvcjogJycsXG4gICAgY29ubmVjdGVkOiBmYWxzZSxcbiAgfTtcblxuICAvKipcbiAgICogSW5wdXQgZGF0YSB0byB1c2VkIG9uIG1hbnVhbCBhbmQgQUkgY29udHJvbFxuICAgKiBAcHJvcGVydHkgTGVnb0Jvb3N0I2NvbnRyb2xEYXRhXG4gICAqL1xuICBwdWJsaWMgY29udHJvbERhdGE6IENvbnRyb2xEYXRhID0ge1xuICAgIGlucHV0OiBudWxsLFxuICAgIHNwZWVkOiAwLFxuICAgIHR1cm5BbmdsZTogMCxcbiAgICB0aWx0OiB7IHJvbGw6IDAsIHBpdGNoOiAwIH0sXG4gICAgZm9yY2VTdGF0ZTogbnVsbCxcbiAgICB1cGRhdGVJbnB1dE1vZGU6IG51bGwsXG4gICAgY29udHJvbFVwZGF0ZVRpbWU6IHVuZGVmaW5lZCxcbiAgICBzdGF0ZTogdW5kZWZpbmVkLFxuICB9O1xuXG4gIC8qKlxuICAgKiBEcml2ZSBmb3J3YXJkIHVudGlsIHdhbGwgaXMgcmVhY2VkIG9yIGRyaXZlIGJhY2t3YXJkcyAxMDBtZXRlcnNcbiAgICogQG1ldGhvZCBMZWdvQm9vc3QjY29ubmVjdFxuICAgKiBAcGFyYW0ge0Jvb3N0Q29uZmlndXJhdGlvbn0gW2NvbmZpZ3VyYXRpb249e31dIExlZ28gYm9vc3QgbW90b3IgYW5kIGNvbnRyb2wgY29uZmlndXJhdGlvblxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGFzeW5jIGNvbm5lY3QoY29uZmlndXJhdGlvbjogQm9vc3RDb25maWd1cmF0aW9uID0ge30pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5jb25maWd1cmF0aW9uID0gY29uZmlndXJhdGlvbjtcbiAgICAgIGNvbnN0IGJsdWV0b290aCA9IGF3YWl0IEJvb3N0Q29ubmVjdG9yLmNvbm5lY3QodGhpcy5oYW5kbGVHYXR0RGlzY29ubmVjdC5iaW5kKHRoaXMpKTtcbiAgICAgIHRoaXMuaW5pdEh1YihibHVldG9vdGgsIHRoaXMuY29uZmlndXJhdGlvbik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5sb2coJ0Vycm9yIGZyb20gY29ubmVjdDogJyArIGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW5pdEh1YihibHVldG9vdGg6IEJsdWV0b290aFJlbW90ZUdBVFRDaGFyYWN0ZXJpc3RpYywgY29uZmlndXJhdGlvbjogQm9vc3RDb25maWd1cmF0aW9uKSB7XG4gICAgdGhpcy5odWIgPSBuZXcgSHViQXN5bmMoYmx1ZXRvb3RoLCBjb25maWd1cmF0aW9uKTtcbiAgICB0aGlzLmh1Yi5sb2dEZWJ1ZyA9IHRoaXMubG9nRGVidWc7XG5cbiAgICB0aGlzLmh1Yi5lbWl0dGVyLm9uKCdkaXNjb25uZWN0JywgYXN5bmMgZXZ0ID0+IHtcbiAgICAgIC8vIFRPRE86IFRoaXMgaXMgbmV2ZXIgbGF1bmNoZWQgYXMgZXZlbnQgY29tZXMgZnJvbSBCb29zdENvbm5lY3RvclxuICAgICAgLy8gYXdhaXQgQm9vc3RDb25uZWN0b3IucmVjb25uZWN0KCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmh1Yi5lbWl0dGVyLm9uKCdjb25uZWN0JywgYXN5bmMgZXZ0ID0+IHtcbiAgICAgIHRoaXMuaHViLmFmdGVySW5pdGlhbGl6YXRpb24oKTtcbiAgICAgIGF3YWl0IHRoaXMuaHViLmxlZEFzeW5jKCd3aGl0ZScpO1xuICAgICAgdGhpcy5sb2dEZWJ1ZygnQ29ubmVjdGVkJyk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmh1YkNvbnRyb2wgPSBuZXcgSHViQ29udHJvbCh0aGlzLmRldmljZUluZm8sIHRoaXMuY29udHJvbERhdGEsIGNvbmZpZ3VyYXRpb24pO1xuICAgIGF3YWl0IHRoaXMuaHViQ29udHJvbC5zdGFydCh0aGlzLmh1Yik7XG5cbiAgICB0aGlzLnVwZGF0ZVRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgdGhpcy5odWJDb250cm9sLnVwZGF0ZSgpO1xuICAgIH0sIDEwMCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhbmRsZUdhdHREaXNjb25uZWN0KCkge1xuICAgIHRoaXMubG9nRGVidWcoJ2hhbmRsZUdhdHREaXNjb25uZWN0Jyk7XG5cbiAgICBpZiAodGhpcy5kZXZpY2VJbmZvLmNvbm5lY3RlZCA9PT0gZmFsc2UpIHJldHVybjtcblxuICAgIHRoaXMuaHViLnNldERpc2Nvbm5lY3RlZCgpO1xuICAgIHRoaXMuZGV2aWNlSW5mby5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICBjbGVhckludGVydmFsKHRoaXMudXBkYXRlVGltZXIpO1xuICAgIHRoaXMubG9nRGVidWcoJ0Rpc2Nvbm5lY3RlZCcpO1xuXG4gICAgLy8gVE9ETzogQ2FuJ3QgZ2V0IGF1dG9yZWNvbm5lY3QgdG8gd29ya1xuICAgIC8vIGlmICh0aGlzLmh1Yi5ub1JlY29ubmVjdCkge1xuICAgIC8vICAgdGhpcy5odWIuc2V0RGlzY29ubmVjdGVkKCk7XG4gICAgLy8gICB0aGlzLmRldmljZUluZm8uY29ubmVjdGVkID0gZmFsc2U7XG4gICAgLy8gfSBlbHNlIHtcbiAgICAvLyAgIHRoaXMuaHViLnNldERpc2Nvbm5lY3RlZCgpO1xuICAgIC8vICAgdGhpcy5kZXZpY2VJbmZvLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIC8vICAgY29uc3QgcmVjb25uZWN0aW9uID0gYXdhaXQgQm9vc3RDb25uZWN0b3IucmVjb25uZWN0KCk7XG4gICAgLy8gICBpZiAocmVjb25uZWN0aW9uWzBdKSB7XG4gICAgLy8gICAgIGF3YWl0IHRoaXMuaW5pdEh1YihyZWNvbm5lY3Rpb25bMV0sIHRoaXMuY29uZmlndXJhdGlvbik7XG4gICAgLy8gICB9IGVsc2Uge1xuICAgIC8vICAgICB0aGlzLmxvZ0RlYnVnKCdSZWNvbm5lY3Rpb24gZmFpbGVkJyk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZSB0aGUgY29sb3Igb2YgdGhlIGxlZCBiZXR3ZWVuIHBpbmsgYW5kIG9yYW5nZVxuICAgKiBAbWV0aG9kIExlZ29Cb29zdCNjaGFuZ2VMZWRcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyBjaGFuZ2VMZWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmh1YiB8fCB0aGlzLmh1Yi5jb25uZWN0ZWQgPT09IGZhbHNlKSByZXR1cm47XG4gICAgdGhpcy5jb2xvciA9IHRoaXMuY29sb3IgPT09ICdwaW5rJyA/ICdvcmFuZ2UnIDogJ3BpbmsnO1xuICAgIGF3YWl0IHRoaXMuaHViLmxlZEFzeW5jKHRoaXMuY29sb3IpO1xuICB9XG5cbiAgLyoqXG4gICAqIERyaXZlIGZvcndhcmQgdW50aWwgd2FsbCBpcyByZWFjZWQgb3IgZHJpdmUgYmFja3dhcmRzIDEwMG1ldGVyc1xuICAgKiBAbWV0aG9kIExlZ29Cb29zdCNkcml2ZVRvRGlyZWN0aW9uXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZGlyZWN0aW9uPTFdIERpcmVjdGlvbiB0byBkcml2ZS4gMSBvciBwb3NpdGl2ZSBpcyBmb3J3YXJkLCAwIG9yIG5lZ2F0aXZlIGlzIGJhY2t3YXJkcy5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyBkcml2ZVRvRGlyZWN0aW9uKGRpcmVjdGlvbiA9IDEpOiBQcm9taXNlPHt9PiB7XG4gICAgaWYgKCF0aGlzLnByZUNoZWNrKCkpIHJldHVybjtcbiAgICBpZiAoZGlyZWN0aW9uID4gMCkgcmV0dXJuIGF3YWl0IHRoaXMuaHViLmRyaXZlVW50aWwoKTtcbiAgICBlbHNlIHJldHVybiBhd2FpdCB0aGlzLmh1Yi5kcml2ZSgtMTAwMDApO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc2Nvbm5lY3QgTGVnbyBCb29zdFxuICAgKiBAbWV0aG9kIExlZ29Cb29zdCNkaXNjb25uZWN0XG4gICAqIEByZXR1cm5zIHtib29sZWFufHVuZGVmaW5lZH1cbiAgICovXG4gIGRpc2Nvbm5lY3QoKTogYm9vbGVhbiB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmh1YiB8fCB0aGlzLmh1Yi5jb25uZWN0ZWQgPT09IGZhbHNlKSByZXR1cm47XG4gICAgdGhpcy5odWIuc2V0RGlzY29ubmVjdGVkKCk7XG4gICAgY29uc3Qgc3VjY2VzcyA9IEJvb3N0Q29ubmVjdG9yLmRpc2Nvbm5lY3QoKTtcbiAgICByZXR1cm4gc3VjY2VzcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCBBSSBtb2RlXG4gICAqIEBtZXRob2QgTGVnb0Jvb3N0I2FpXG4gICAqL1xuICBhaSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaHViIHx8IHRoaXMuaHViLmNvbm5lY3RlZCA9PT0gZmFsc2UpIHJldHVybjtcbiAgICB0aGlzLmh1YkNvbnRyb2wuc2V0TmV4dFN0YXRlKCdEcml2ZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0b3AgZW5naW5lcyBBIGFuZCBCXG4gICAqIEBtZXRob2QgTGVnb0Jvb3N0I3N0b3BcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyBzdG9wKCk6IFByb21pc2U8e30+IHtcbiAgICBpZiAoIXRoaXMucHJlQ2hlY2soKSkgcmV0dXJuO1xuICAgIHRoaXMuY29udHJvbERhdGEuc3BlZWQgPSAwO1xuICAgIHRoaXMuY29udHJvbERhdGEudHVybkFuZ2xlID0gMDtcbiAgICAvLyBjb250cm9sIGRhdGFzIHZhbHVlcyBtaWdodCBoYXZlIGFsd2F5cyBiZWVuIDAsIGV4ZWN1dGUgZm9yY2Ugc3RvcFxuICAgIHJldHVybiBhd2FpdCB0aGlzLmh1Yi5tb3RvclRpbWVNdWx0aUFzeW5jKDEsIDAsIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBCb29zdCBtb3RvciBhbmQgY29udHJvbCBjb25maWd1cmF0aW9uXG4gICAqIEBtZXRob2QgTGVnb0Jvb3N0I3VwZGF0ZUNvbmZpZ3VyYXRpb25cbiAgICogQHBhcmFtIHtCb29zdENvbmZpZ3VyYXRpb259IGNvbmZpZ3VyYXRpb24gQm9vc3QgbW90b3IgYW5kIGNvbnRyb2wgY29uZmlndXJhdGlvblxuICAgKi9cbiAgdXBkYXRlQ29uZmlndXJhdGlvbihjb25maWd1cmF0aW9uOiBCb29zdENvbmZpZ3VyYXRpb24pOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaHViKSByZXR1cm47XG4gICAgdGhpcy5odWIudXBkYXRlQ29uZmlndXJhdGlvbihjb25maWd1cmF0aW9uKTtcbiAgICB0aGlzLmh1YkNvbnRyb2wudXBkYXRlQ29uZmlndXJhdGlvbihjb25maWd1cmF0aW9uKTtcbiAgfVxuXG4gIC8vIE1ldGhvZHMgZnJvbSBIdWJcblxuICAvKipcbiAgICogQ29udHJvbCB0aGUgTEVEIG9uIHRoZSBNb3ZlIEh1YlxuICAgKiBAbWV0aG9kIExlZ29Cb29zdCNsZWRcbiAgICogQHBhcmFtIHtib29sZWFufG51bWJlcnxzdHJpbmd9IGNvbG9yXG4gICAqIElmIHNldCB0byBib29sZWFuIGBmYWxzZWAgdGhlIExFRCBpcyBzd2l0Y2hlZCBvZmYsIGlmIHNldCB0byBgdHJ1ZWAgdGhlIExFRCB3aWxsIGJlIHdoaXRlLlxuICAgKiBQb3NzaWJsZSBzdHJpbmcgdmFsdWVzOiBgb2ZmYCwgYHBpbmtgLCBgcHVycGxlYCwgYGJsdWVgLCBgbGlnaHRibHVlYCwgYGN5YW5gLCBgZ3JlZW5gLCBgeWVsbG93YCwgYG9yYW5nZWAsIGByZWRgLFxuICAgKiBgd2hpdGVgXG4gICAqL1xuICBsZWQoY29sb3I6IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlQ2hlY2soKSkgcmV0dXJuO1xuICAgIHRoaXMuaHViLmxlZChjb2xvcik7XG4gIH1cblxuICAvKipcbiAgICogQ29udHJvbCB0aGUgTEVEIG9uIHRoZSBNb3ZlIEh1YlxuICAgKiBAbWV0aG9kIExlZ29Cb29zdCNsZWRBc3luY1xuICAgKiBAcGFyYW0ge2Jvb2xlYW58bnVtYmVyfHN0cmluZ30gY29sb3JcbiAgICogSWYgc2V0IHRvIGJvb2xlYW4gYGZhbHNlYCB0aGUgTEVEIGlzIHN3aXRjaGVkIG9mZiwgaWYgc2V0IHRvIGB0cnVlYCB0aGUgTEVEIHdpbGwgYmUgd2hpdGUuXG4gICAqIFBvc3NpYmxlIHN0cmluZyB2YWx1ZXM6IGBvZmZgLCBgcGlua2AsIGBwdXJwbGVgLCBgYmx1ZWAsIGBsaWdodGJsdWVgLCBgY3lhbmAsIGBncmVlbmAsIGB5ZWxsb3dgLCBgb3JhbmdlYCwgYHJlZGAsXG4gICAqIGB3aGl0ZWBcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyBsZWRBc3luYyhjb2xvcjogYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZyk6IFByb21pc2U8e30+IHtcbiAgICBpZiAoIXRoaXMucHJlQ2hlY2soKSkgcmV0dXJuO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLmh1Yi5sZWRBc3luYyhjb2xvcik7XG4gIH1cblxuICAvKipcbiAgICogUnVuIGEgbW90b3IgZm9yIHNwZWNpZmljIHRpbWVcbiAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBwb3J0IHBvc3NpYmxlIHN0cmluZyB2YWx1ZXM6IGBBYCwgYEJgLCBgQUJgLCBgQ2AsIGBEYC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHNcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkdXR5Q3ljbGU9MTAwXSBtb3RvciBwb3dlciBwZXJjZW50YWdlIGZyb20gYC0xMDBgIHRvIGAxMDBgLiBJZiBhIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuIHJvdGF0aW9uXG4gICAqIGlzIGNvdW50ZXJjbG9ja3dpc2UuXG4gICAqL1xuICBtb3RvclRpbWUocG9ydDogc3RyaW5nIHwgbnVtYmVyLCBzZWNvbmRzOiBudW1iZXIsIGR1dHlDeWNsZSA9IDEwMCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVDaGVjaygpKSByZXR1cm47XG4gICAgdGhpcy5odWIubW90b3JUaW1lKHBvcnQsIHNlY29uZHMsIGR1dHlDeWNsZSk7XG4gIH1cblxuICAvKipcbiAgICogUnVuIGEgbW90b3IgZm9yIHNwZWNpZmljIHRpbWVcbiAgICogQG1ldGhvZCBMZWdvQm9vc3QjbW90b3JUaW1lQXN5bmNcbiAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBwb3J0IHBvc3NpYmxlIHN0cmluZyB2YWx1ZXM6IGBBYCwgYEJgLCBgQUJgLCBgQ2AsIGBEYC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHNcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkdXR5Q3ljbGU9MTAwXSBtb3RvciBwb3dlciBwZXJjZW50YWdlIGZyb20gYC0xMDBgIHRvIGAxMDBgLiBJZiBhIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuIHJvdGF0aW9uXG4gICAqIGlzIGNvdW50ZXJjbG9ja3dpc2UuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3dhaXQ9ZmFsc2VdIHdpbGwgcHJvbWlzZSB3YWl0IHVuaXRsbCBtb3RvclRpbWUgcnVuIHRpbWUgaGFzIGVsYXBzZWRcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyBtb3RvclRpbWVBc3luYyhcbiAgICBwb3J0OiBzdHJpbmcgfCBudW1iZXIsXG4gICAgc2Vjb25kczogbnVtYmVyLFxuICAgIGR1dHlDeWNsZTogbnVtYmVyID0gMTAwLFxuICAgIHdhaXQ6IGJvb2xlYW4gPSB0cnVlXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5wcmVDaGVjaygpKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5odWIubW90b3JUaW1lQXN5bmMocG9ydCwgc2Vjb25kcywgZHV0eUN5Y2xlLCB3YWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gYm90aCBtb3RvcnMgKEEgYW5kIEIpIGZvciBzcGVjaWZpYyB0aW1lXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkdXR5Q3ljbGVBIG1vdG9yIHBvd2VyIHBlcmNlbnRhZ2UgZnJvbSBgLTEwMGAgdG8gYDEwMGAuIElmIGEgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4gcm90YXRpb25cbiAgICogaXMgY291bnRlcmNsb2Nrd2lzZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGR1dHlDeWNsZUIgbW90b3IgcG93ZXIgcGVyY2VudGFnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiByb3RhdGlvblxuICAgKiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKi9cbiAgbW90b3JUaW1lTXVsdGkoc2Vjb25kczogbnVtYmVyLCBkdXR5Q3ljbGVBOiBudW1iZXIgPSAxMDAsIGR1dHlDeWNsZUI6IG51bWJlciA9IDEwMCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVDaGVjaygpKSByZXR1cm47XG4gICAgdGhpcy5odWIubW90b3JUaW1lTXVsdGkoc2Vjb25kcywgZHV0eUN5Y2xlQSwgZHV0eUN5Y2xlQik7XG4gIH1cblxuICAvKipcbiAgICogUnVuIGJvdGggbW90b3JzIChBIGFuZCBCKSBmb3Igc3BlY2lmaWMgdGltZVxuICAgKiBAbWV0aG9kIExlZ29Cb29zdCNtb3RvclRpbWVNdWx0aUFzeW5jXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZHV0eUN5Y2xlQT0xMDBdIG1vdG9yIHBvd2VyIHBlcmNlbnRhZ2UgZnJvbSBgLTEwMGAgdG8gYDEwMGAuIElmIGEgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4gcm90YXRpb25cbiAgICogaXMgY291bnRlcmNsb2Nrd2lzZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkdXR5Q3ljbGVCPTEwMF0gbW90b3IgcG93ZXIgcGVyY2VudGFnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiByb3RhdGlvblxuICAgKiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PWZhbHNlXSB3aWxsIHByb21pc2Ugd2FpdCB1bml0bGwgbW90b3JUaW1lIHJ1biB0aW1lIGhhcyBlbGFwc2VkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgYXN5bmMgbW90b3JUaW1lTXVsdGlBc3luYyhcbiAgICBzZWNvbmRzOiBudW1iZXIsXG4gICAgZHV0eUN5Y2xlQTogbnVtYmVyID0gMTAwLFxuICAgIGR1dHlDeWNsZUI6IG51bWJlciA9IDEwMCxcbiAgICB3YWl0OiBib29sZWFuID0gdHJ1ZVxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMucHJlQ2hlY2soKSkgcmV0dXJuO1xuICAgIGF3YWl0IHRoaXMuaHViLm1vdG9yVGltZU11bHRpQXN5bmMoc2Vjb25kcywgZHV0eUN5Y2xlQSwgZHV0eUN5Y2xlQiwgd2FpdCk7XG4gIH1cblxuICAvKipcbiAgICogVHVybiBhIG1vdG9yIGJ5IHNwZWNpZmljIGFuZ2xlXG4gICAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcn0gcG9ydCBwb3NzaWJsZSBzdHJpbmcgdmFsdWVzOiBgQWAsIGBCYCwgYEFCYCwgYENgLCBgRGAuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBhbmdsZSAtIGRlZ3JlZXMgdG8gdHVybiBmcm9tIGAwYCB0byBgMjE0NzQ4MzY0N2BcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkdXR5Q3ljbGU9MTAwXSBtb3RvciBwb3dlciBwZXJjZW50YWdlIGZyb20gYC0xMDBgIHRvIGAxMDBgLiBJZiBhIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuXG4gICAqIHJvdGF0aW9uIGlzIGNvdW50ZXJjbG9ja3dpc2UuXG4gICAqL1xuICBtb3RvckFuZ2xlKHBvcnQ6IHN0cmluZyB8IG51bWJlciwgYW5nbGU6IG51bWJlciwgZHV0eUN5Y2xlOiBudW1iZXIgPSAxMDApOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlQ2hlY2soKSkgcmV0dXJuO1xuICAgIHRoaXMuaHViLm1vdG9yQW5nbGUocG9ydCwgYW5nbGUsIGR1dHlDeWNsZSk7XG4gIH1cblxuICAvKipcbiAgICogVHVybiBhIG1vdG9yIGJ5IHNwZWNpZmljIGFuZ2xlXG4gICAqIEBtZXRob2QgTGVnb0Jvb3N0I21vdG9yQW5nbGVBc3luY1xuICAgKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ9IHBvcnQgcG9zc2libGUgc3RyaW5nIHZhbHVlczogYEFgLCBgQmAsIGBBQmAsIGBDYCwgYERgLlxuICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGUgLSBkZWdyZWVzIHRvIHR1cm4gZnJvbSBgMGAgdG8gYDIxNDc0ODM2NDdgXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZHV0eUN5Y2xlPTEwMF0gbW90b3IgcG93ZXIgcGVyY2VudGFnZSBmcm9tIGAtMTAwYCB0byBgMTAwYC4gSWYgYSBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlblxuICAgKiByb3RhdGlvbiBpcyBjb3VudGVyY2xvY2t3aXNlLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PWZhbHNlXSB3aWxsIHByb21pc2Ugd2FpdCB1bml0bGwgbW90b3JBbmdsZSBoYXMgdHVybmVkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgYXN5bmMgbW90b3JBbmdsZUFzeW5jKFxuICAgIHBvcnQ6IHN0cmluZyB8IG51bWJlcixcbiAgICBhbmdsZTogbnVtYmVyLFxuICAgIGR1dHlDeWNsZTogbnVtYmVyID0gMTAwLFxuICAgIHdhaXQ6IGJvb2xlYW4gPSB0cnVlXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5wcmVDaGVjaygpKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5odWIubW90b3JBbmdsZUFzeW5jKHBvcnQsIGFuZ2xlLCBkdXR5Q3ljbGUsIHdhaXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFR1cm4gYm90aCBtb3RvcnMgKEEgYW5kIEIpIGJ5IHNwZWNpZmljIGFuZ2xlXG4gICAqIEBtZXRob2QgTGVnb0Jvb3N0I21vdG9yQW5nbGVNdWx0aVxuICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGUgZGVncmVlcyB0byB0dXJuIGZyb20gYDBgIHRvIGAyMTQ3NDgzNjQ3YFxuICAgKiBAcGFyYW0ge251bWJlcn0gZHV0eUN5Y2xlQSBtb3RvciBwb3dlciBwZXJjZW50YWdlIGZyb20gYC0xMDBgIHRvIGAxMDBgLiBJZiBhIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuXG4gICAqIHJvdGF0aW9uIGlzIGNvdW50ZXJjbG9ja3dpc2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkdXR5Q3ljbGVCIG1vdG9yIHBvd2VyIHBlcmNlbnRhZ2UgZnJvbSBgLTEwMGAgdG8gYDEwMGAuIElmIGEgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW5cbiAgICogcm90YXRpb24gaXMgY291bnRlcmNsb2Nrd2lzZS5cbiAgICovXG4gIG1vdG9yQW5nbGVNdWx0aShhbmdsZTogbnVtYmVyLCBkdXR5Q3ljbGVBOiBudW1iZXIgPSAxMDAsIGR1dHlDeWNsZUI6IG51bWJlciA9IDEwMCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVDaGVjaygpKSByZXR1cm47XG4gICAgdGhpcy5odWIubW90b3JBbmdsZU11bHRpKGFuZ2xlLCBkdXR5Q3ljbGVBLCBkdXR5Q3ljbGVCKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUdXJuIGJvdGggbW90b3JzIChBIGFuZCBCKSBieSBzcGVjaWZpYyBhbmdsZVxuICAgKiBAbWV0aG9kIExlZ29Cb29zdCNtb3RvckFuZ2xlTXVsdGlBc3luY1xuICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGUgZGVncmVlcyB0byB0dXJuIGZyb20gYDBgIHRvIGAyMTQ3NDgzNjQ3YFxuICAgKiBAcGFyYW0ge251bWJlcn0gW2R1dHlDeWNsZUE9MTAwXSBtb3RvciBwb3dlciBwZXJjZW50YWdlIGZyb20gYC0xMDBgIHRvIGAxMDBgLiBJZiBhIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuXG4gICAqIHJvdGF0aW9uIGlzIGNvdW50ZXJjbG9ja3dpc2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZHV0eUN5Y2xlQj0xMDBdIG1vdG9yIHBvd2VyIHBlcmNlbnRhZ2UgZnJvbSBgLTEwMGAgdG8gYDEwMGAuIElmIGEgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW5cbiAgICogcm90YXRpb24gaXMgY291bnRlcmNsb2Nrd2lzZS5cbiAgICogQHBhcmFtIHtib29sZWFufSBbd2FpdD1mYWxzZV0gd2lsbCBwcm9taXNlIHdhaXQgdW5pdGxsIG1vdG9yQW5nbGUgaGFzIHR1cm5lZFxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGFzeW5jIG1vdG9yQW5nbGVNdWx0aUFzeW5jKFxuICAgIGFuZ2xlOiBudW1iZXIsXG4gICAgZHV0eUN5Y2xlQTogbnVtYmVyID0gMTAwLFxuICAgIGR1dHlDeWNsZUI6IG51bWJlciA9IDEwMCxcbiAgICB3YWl0OiBib29sZWFuID0gdHJ1ZVxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMucHJlQ2hlY2soKSkgcmV0dXJuO1xuICAgIGF3YWl0IHRoaXMuaHViLm1vdG9yQW5nbGVNdWx0aUFzeW5jKGFuZ2xlLCBkdXR5Q3ljbGVBLCBkdXR5Q3ljbGVCLCB3YWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEcml2ZSBzcGVjaWZpZWQgZGlzdGFuY2VcbiAgICogQG1ldGhvZCBMZWdvQm9vc3QjZHJpdmVcbiAgICogQHBhcmFtIHtudW1iZXJ9IGRpc3RhbmNlIGRpc3RhbmNlIGluIGNlbnRpbWV0ZXJzIChkZWZhdWx0KSBvciBpbmNoZXMuIFBvc2l0aXZlIGlzIGZvcndhcmQgYW5kIG5lZ2F0aXZlIGlzIGJhY2t3YXJkLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PXRydWVdIHdpbGwgcHJvbWlzZSB3YWl0IHVudGlsbCB0aGUgZHJpdmUgaGFzIGNvbXBsZXRlZC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyBkcml2ZShkaXN0YW5jZTogbnVtYmVyLCB3YWl0OiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8e30+IHtcbiAgICBpZiAoIXRoaXMucHJlQ2hlY2soKSkgcmV0dXJuO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLmh1Yi5kcml2ZShkaXN0YW5jZSwgd2FpdCk7XG4gIH1cblxuICAvKipcbiAgICogVHVybiByb2JvdCBzcGVjaWZpZWQgZGVncmVlc1xuICAgKiBAbWV0aG9kIExlZ29Cb29zdCN0dXJuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkZWdyZWVzIGRlZ3JlZXMgdG8gdHVybi4gTmVnYXRpdmUgaXMgdG8gdGhlIGxlZnQgYW5kIHBvc2l0aXZlIHRvIHRoZSByaWdodC5cbiAgICogQHBhcmFtIHtib29sZWFufSBbd2FpdD10cnVlXSB3aWxsIHByb21pc2Ugd2FpdCB1bnRpbGwgdGhlIHR1cm4gaGFzIGNvbXBsZXRlZC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyB0dXJuKGRlZ3JlZXM6IG51bWJlciwgd2FpdDogYm9vbGVhbiA9IHRydWUpOiBQcm9taXNlPHt9PiB7XG4gICAgaWYgKCF0aGlzLnByZUNoZWNrKCkpIHJldHVybjtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5odWIudHVybihkZWdyZWVzLCB3YWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEcml2ZSB1bnRpbGwgc2Vuc29yIHNob3dzIG9iamVjdCBpbiBkZWZpbmVkIGRpc3RhbmNlXG4gICAqIEBtZXRob2QgTGVnb0Jvb3N0I2RyaXZlVW50aWxcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkaXN0YW5jZT0wXSBkaXN0YW5jZSBpbiBjZW50aW1ldGVycyAoZGVmYXVsdCkgb3IgaW5jaGVzIHdoZW4gdG8gc3RvcC4gRGlzdGFuY2Ugc2Vuc29yIGlzIG5vdCB2ZXJ5IHNlbnNpdGl2ZSBvciBhY2N1cmF0ZS5cbiAgICogQnkgZGVmYXVsdCB3aWxsIHN0b3Agd2hlbiBzZW5zb3Igbm90aWNlcyB3YWxsIGZvciB0aGUgZmlyc3QgdGltZS4gU2Vuc29yIGRpc3RhbmNlIHZhbHVlcyBhcmUgdXN1YWx5IGJldHdlZW4gMTEwLTUwLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PXRydWVdIHdpbGwgcHJvbWlzZSB3YWl0IHVudGlsbCB0aGUgYm90IHdpbGwgc3RvcC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyBkcml2ZVVudGlsKGRpc3RhbmNlOiBudW1iZXIgPSAwLCB3YWl0OiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8YW55PiB7XG4gICAgaWYgKCF0aGlzLnByZUNoZWNrKCkpIHJldHVybjtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5odWIuZHJpdmVVbnRpbChkaXN0YW5jZSwgd2FpdCk7XG4gIH1cblxuICAvKipcbiAgICogVHVybiB1bnRpbCB0aGVyZSBpcyBubyBvYmplY3QgaW4gc2Vuc29ycyBzaWdodFxuICAgKiBAbWV0aG9kIExlZ29Cb29zdCN0dXJuVW50aWxcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkaXJlY3Rpb249MV0gZGlyZWN0aW9uIHRvIHR1cm4gdG8uIDEgKG9yIGFueSBwb3NpdGl2ZSkgaXMgdG8gdGhlIHJpZ2h0IGFuZCAwIChvciBhbnkgbmVnYXRpdmUpIGlzIHRvIHRoZSBsZWZ0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt3YWl0PXRydWVdIHdpbGwgcHJvbWlzZSB3YWl0IHVudGlsbCB0aGUgYm90IHdpbGwgc3RvcC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBhc3luYyB0dXJuVW50aWwoZGlyZWN0aW9uOiBudW1iZXIgPSAxLCB3YWl0OiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8YW55PiB7XG4gICAgaWYgKCF0aGlzLnByZUNoZWNrKCkpIHJldHVybjtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5odWIudHVyblVudGlsKGRpcmVjdGlvbiwgd2FpdCk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCByYXcgZGF0YVxuICAgKiBAcGFyYW0ge29iamVjdH0gcmF3IHJhdyBkYXRhXG4gICAqL1xuICByYXdDb21tYW5kKHJhdzogUmF3RGF0YSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVDaGVjaygpKSByZXR1cm47XG4gICAgcmV0dXJuIHRoaXMuaHViLnJhd0NvbW1hbmQocmF3KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJlQ2hlY2soKTogYm9vbGVhbiB7XG4gICAgaWYgKCF0aGlzLmh1YiB8fCB0aGlzLmh1Yi5jb25uZWN0ZWQgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gICAgdGhpcy5odWJDb250cm9sLnNldE5leHRTdGF0ZSgnTWFudWFsJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cbiJdfQ==
