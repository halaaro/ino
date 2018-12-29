# ino

A javascript client library for Aras Innovator


## Example Usage

```js
const InoServer = require("ino");

const server = new InoServer("https://innovator.url", "DatabaseName");

server.auth("username", "password").then(() => {
  server.applyAML(
    `<AML>
        <Item type="Part" action="edit" id="1234">
          <item_number>1234-5678</item_number>
        </Item>
      <AML>`
  )
})
```
