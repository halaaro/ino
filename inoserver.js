
const md5 = require('md5')
const request = require('request')
var xpath = require('xpath')
var dom = require('xmldom').DOMParser
var convert = require('xml-js');

const xml2jsonOpts = { 
    compact: true, 
    spaces: 4, 
    nativeType: true, 
    attributesKey: 'attr', 
    textKey: 'value', 
    cdataKey: 'value', 
    commentKey: 'value'
}


class InoServer {

    constructor(url, database) {
        this.url = url
        this.database = database
    }

    _tryAuth(resolve, reject) {
        return this.applyAML(`<AML><Item type="User" action="get"><login>${this.user}</login></Item></AML>`)
            .then(resolve).catch(reject)
    }

    auth(user, password) {
        this.user = user,
            this.password = md5(password)
        return this._tryAuth()
    }

    applyAML(aml) {

        const options = {
            url: this.url + 'Server/InnovatorServer.aspx',
            headers: {
                'SOAPaction': 'ApplyAML',
                'AUTHUSER': this.user,
                'AUTHPASSWORD': this.password,
                'DATABASE': this.database
            }
        }

        const body =
            `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
            <SOAP-ENV:Body><ApplyAML>${aml}</ApplyAML></SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`

        const p = new Promise(function (resolve, reject) {

            function callback(error, response, body) {
                if (error) {
                    reject(error)
                }
                if (!error && response.statusCode == 200) {
                    const doc = new dom().parseFromString(body)
                    const select = xpath.useNamespaces({ 'SOAP-ENV': "http://schemas.xmlsoap.org/soap/envelope/", af: "http://www.aras.com/InnovatorFault" })
                    var fault = select('/SOAP-ENV:Envelope/SOAP-ENV:Body/SOAP-ENV:Fault/detail', doc)
                    if (fault.length) {
                        //console.log(fault.toString())
                        const detail = select('/SOAP-ENV:Envelope/SOAP-ENV:Body/SOAP-ENV:Fault/detail/af:legacy_detail/text()', doc, 1).nodeValue
                        reject({ detail })
                    }

                    var nodes = select("//Result", doc)
                    resolve( 
                        JSON.parse(
                            convert.xml2json(nodes.toString(), xml2jsonOpts)    
                        )
                    )
                }
            }

            request.post(Object.assign(options, { body }), callback)
        })

        return p
    }
}

module.exports = InoServer
