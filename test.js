const assert = require('assert')
const zmd5 = require('.')
const MemoryStream = require('memorystream')

describe('zmd5', () => {
	it('devrait décompresser correctement un octet', () => {
		const s = new MemoryStream()

		const b = Buffer.from([0x01])
		const w = zmd5.créerPosteur(s)
		w.write(b)
		w.end()

		return zmd5.créerAppliqué(s)
		.then(decompressed => {
			assert.deepEqual(decompressed, b)
		})
	})

	it('devrait décompresser correctement deux octets', () => {
		const s = new MemoryStream()

		const b = Buffer.from([0xF1, 0x01])
		const w = zmd5.créerPosteur(s)
		w.write(b)
		w.end()

		return zmd5.créerAppliqué(s)
		.then(decompressed => {
			assert.deepEqual(decompressed, b)
		})
	})
})
