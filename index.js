const md5 = require('blueimp-md5')
const axios = require('axios').default
const axiosCookieJarSupport = require('@3846masa/axios-cookiejar-support').default
var xml2js = require('xml-js').xml2js

const tough = require('tough-cookie');

axiosCookieJarSupport(axios);

const cookieJar = new tough.CookieJar();


const keys = {
    attr: 'attr',
    text: 'value',
    cdata: 'value'
}

const xml2jsOpts = { 
    compact: true, 
    attributesKey: keys.attr, 
    textKey: keys.text,
    cdataKey: keys.cdata
}

const soapBody = (verb, body) => `
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
    <SOAP-ENV:Body><${ verb }>${ body }</${ verb }></SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`

class InoServer {

    constructor(url, database) {
        this.url = url
        this.database = database
    }

    auth(user, password) {
        this.user = user,
        this.password = md5(password)
        return this.soap(
            'ApplyAML',
            `<AML><Item type="User" action="get" select="id"><login_name>${ this.user }</login_name></Item></AML>`)
    }

    applyAML(body) { return this.soap( 'ApplyAML', body ) }

    soap(verb, body) {

        const options = {
            url: this.url + '/Server/InnovatorServer.aspx',
            method: 'post',
            responseType: 'string',
            headers: { 
                'SOAPaction': verb,
                'AUTHUSER': this.user,
                'AUTHPASSWORD': this.password,
                'DATABASE': this.database
            },
            withCredentials: true,
            jar: cookieJar,
            data: soapBody( verb, body )
        }

        return axios(options).then( response => {
                
            if (response.status !== 200) {
                throw `request error (${ response.status }): ${ response.statusText }`
            }
            
            const body = xml2js(response.data, xml2jsOpts)['SOAP-ENV:Envelope']['SOAP-ENV:Body']
            const fault = body['SOAP-ENV:Fault']
            if (fault != null) {
                throw `fault: (${ fault.faultcode[keys.text] }) ${ fault.faultstring[keys.cdata] }`
            }

            return body.Result
        })
    }
}

module.exports = InoServer
