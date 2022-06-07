const axios = require('axios')
const shortid = require('shortid')

// import algo-methods
const { aesEncrypt, aesDecrypt } = require('./algorithms/aes')
const { RSAEncrypt, RSADecrypt } = require('./algorithms/rsa')

/**
 * @description initialize the Kuda wrapper function
 * @param {object} param => publicKeyPath, privateKeyPath, clientKey, baseUrl
 * @return {function} request function
 */
function Kuda (param) {
  if (!param) return console.log('Error: publicKey, privateKey, clientKey, baseUrl are required!')

  let { publicKey, privateKey, baseUrl } = param
  publicKey = publicKey.toString()
  privateKey = privateKey.toString()

  const { clientKey } = param
  if (!publicKey) return console.log('Error: publicKey is required!')
  if (!privateKey) return console.log('Error: privateKey is required!')
  if (!clientKey) return console.log('Error: clientKey is required!')
  if (!baseUrl) return console.log('Error: baseUrl is required!')

  const password = `${clientKey}-${shortid.generate().substring(0, 5)}`

  /**
   * makes an encrypted call to Kuda API
   * @param {object} params => serviceType, requestRef, data
   * @return {object} data return decrypted data response object
   */
  async function request (params) {
    return new Promise(async (resolve, reject) => {
      if (!params) return console.log('Error: serviceType, requestRef and data are required!')

      const { serviceType, requestRef, data } = params

      const payload = JSON.stringify({
        serviceType,
        requestRef,
        data
      })

      try {
        // aes encrypt payload with password
        const encryptedPayload = await aesEncrypt(payload, password)
        // rsa encrypt password with public key
        const encryptedPassword = await RSAEncrypt(password, publicKey)

        // make encrypted api request to Kuda Bank
        const { data: encryptedResponse } = await axios.post(baseUrl, {
          data: encryptedPayload
        }, {
          headers: {
            password: encryptedPassword
          }
        })

        // plaintext = RSA decrypt password with our privateKey
        const plaintext = await RSADecrypt(encryptedResponse.password, privateKey).toString()
        // data = AES decrypt data with plaintext
        let data = await aesDecrypt(encryptedResponse.data, plaintext)
        if (typeof data === 'string') data = JSON.parse(data)

        // console.log('encrypted response:', JSON.stringify({
        //   encryptedResponse,
        //   plaintext,
        //   data: JSON.parse(data)
        // }, null, 2))

        resolve(data)
      } catch (err) {
        reject(err)
      }
    })
  }

  return request
}

module.exports = Kuda
