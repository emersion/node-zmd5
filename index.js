const crypto = require('crypto')

function créerPosteur(conn) {
	conn.write('CC')
	conn.write('Z')

	const somme = crypto.createHash('md5')

	somme.on('readable', () => {
		const clef = somme.read()
		if (!clef) {
			return conn.emit('error', 'Impossible de créer la clef')
		}

		conn.write(clef.toString('hex'))
	})

	return somme
}

function incrémenter(serrure) {
	for (let [i, v] of serrure.entries()) {
		if (v < 255) {
			serrure[i]++
			return [serrure, i+1]
		} else {
			serrure[i] = 0
		}
	}

	let nouvelleSerrure = Buffer.alloc(2*serrure.length)
	serrure.copy(nouvelleSerrure)
	nouvelleSerrure[serrure.length] = 1
	return [nouvelleSerrure, serrure.length+1]
}

function trouverSerrure(clef, serrure, longueur) {
	return new Promise((succès, erreur) => {
		const somme = crypto.createHash('md5')

		somme.on('readable', () => {
			const clefCandidate = somme.read()
			if (!clefCandidate) {
				return erreur('Impossible de créer la clef candidate')
			}

			if (clefCandidate.equals(clef)) {
				succès(serrure)
			} else {
				trouverSerrure(clef, ...incrémenter(serrure))
			}
		})

		somme.write(serrure.slice(0, longueur))
		somme.end()
	})
}

function créerAppliqué(conn) {
	return new Promise((succès, erreur) => {
		let ccReçu = false
		let zReçu = false
		let clefHex = ''

		conn.on('data', tampon => {
			if (!ccReçu) {
				if (tampon.slice(0, 2).toString() == 'CC') {
					ccReçu = true
					tampon = tampon.slice(2)
				} else {
					conn.end()
					return erreur('Message CC non reçu')
				}
			}
			if (!zReçu) {
				if (tampon.slice(0, 1).toString() == 'Z') {
					zReçu = true
					tampon = tampon.slice(1)
				} else {
					conn.end()
					return erreur('Message Z non reçu')
				}
			}

			clefHex += tampon.toString()
		})

		conn.on('end', () => {
			if (!prêt) {
				return
			}

			const clef = Buffer.from(clefHex, 'hex')
			trouverSerrure(clef, Buffer.alloc(512), 0)
		})
	})
}

module.exports = {
	créerPosteur,
	créerAppliqué
}
