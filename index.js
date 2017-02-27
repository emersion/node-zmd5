const crypto = require('crypto')

function créerPosteur(conn) {
	conn.write('CC')
	conn.write('Z')

	const somme = crypto.createHash('md5')

	somme.on('data', (clef) => {
		conn.write(clef.toString('hex'))
		conn.end()
	})

	return somme
}

function incrémenter(serrure, longueur) {
	for (let [i, v] of serrure.entries()) {
		if (v < 255) {
			serrure[i]++
			if (i >= longueur) {
				longueur = i + 1;
			}
			return [serrure, longueur]
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

		somme.on('data', (clefCandidate) => {
			if (clefCandidate.equals(clef)) {
				succès(serrure.slice(0, longueur))
			} else {
				trouverSerrure(clef, ...incrémenter(serrure, longueur))
				.then(succès)
				.catch(erreur)
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
					return erreur(new Error('Message CC non reçu'))
				}
			}
			if (tampon.length == 0) {
				return
			}
			if (!zReçu) {
				if (tampon.slice(0, 1).toString() == 'Z') {
					zReçu = true
					tampon = tampon.slice(1)
				} else {
					conn.end()
					return erreur(new Error('Message Z non reçu'))
				}
			}

			clefHex += tampon.toString()
		})

		conn.on('end', () => {
			if (!ccReçu || !zReçu) {
				return
			}

			const clef = Buffer.from(clefHex, 'hex')
			trouverSerrure(clef, Buffer.alloc(512), 0)
			.then(succès)
			.catch(erreur)
		})
	})
}

module.exports = {
	créerPosteur,
	créerAppliqué
}
