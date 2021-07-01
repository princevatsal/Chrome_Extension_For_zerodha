var oldURL = "";
var currentURL = window.location.href;
function checkURLchange(currentURL) {
    if (currentURL != oldURL) {
        var splittedUrl = currentURL.split("/")
        var ticker_number = splittedUrl[splittedUrl.length - 1];
        var final_ticker_number = ticker_number.split("#")[0]
        oldURL = currentURL;
        console.log(final_ticker_number)
        fetch("http://localhost:3000", {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ identifier: final_ticker_number })
        }).then(resp => {
            if (resp.status == 200) {
                resp.text().then((text) => {
                    var data = JSON.parse(text)
                    document.querySelector('#InjectedElement') && document.querySelector('#InjectedElement').remove()
                    const parentDivision = document.querySelector("iframe").parentElement;
                    console.log(parentDivision)
                    const element = document.createElement("div")
                    element.style = "backgroud:#000;position:absolute;top:0px;right:0px;padding:5px;background:#000"
                    element.id = "InjectedElement"
                    element.innerHTML =
                        `
                    <div style="display:flex;flex-direction:row;">
                    <div style="display:flex;flex-direction:column;margin-right:7px">
                        <p style="color:#fff;margin:0;color:orange">Open</p>
                        <p style="color:#fff;margin:0;color:orange">${data.OPEN}</p>
                    </div>
                    <div style="display:flex;flex-direction:column;margin-right:7px">
                        <p style="color:#fff;margin:0;color:red">High</p>
                        <p style="color:#fff;margin:0;color:red">${data.HIGH}</p>
                    </div>
                    <div style="display:flex;flex-direction:column;margin-right:7px">
                        <p style="color:#fff;margin:0;color:orange">Low</p>
                        <p style="color:#fff;margin:0;color:orange">${data.LOW}</p>
                    </div>
                    <div style="display:flex;flex-direction:column;margin-right:7px">
                        <p style="color:#fff;margin:0;color:red">Close</p>
                        <p style="color:#fff;margin:0;color:red">${data.CLOSE}</p>
                    </div>
                    <button color="#fff;background:#2b2222;border:0;" onclick="document.querySelector('#InjectedElement')&&document.querySelector('#InjectedElement').remove()">Hide</button>
                    </div>
                    `
                    parentDivision.appendChild(element)
                }).catch(err => {
                    console.log("this error:-", err)
                    console.log(document.querySelector('#InjectedElement'))
                    document.querySelector('#InjectedElement') && document.querySelector('#InjectedElement').remove()
                })
            } else {
                resp.text().then((text) => {
                    console.log("error:-", text)
                    console.log(document.querySelector('#InjectedElement'))
                    document.querySelector('#InjectedElement') && document.querySelector('#InjectedElement').remove()
                })
            }
        }).catch(err => {
            console.log("error:-", err)
            console.log(document.querySelector('#InjectedElement'))
            document.querySelector('#InjectedElement') && document.querySelector('#InjectedElement').remove()
        })
    }

    oldURL = window.location.href;
    setTimeout(function () {
        checkURLchange(window.location.href);
    }, 1000);
}

var interval = setInterval(() => {
    console.log("finding")
    var iframe = document.querySelector("iframe");
    if (iframe) {
        var element = iframe.contentWindow.document.querySelector(".pane-legend-title__description")
        if (element && element.innerText && element.innerText.length > 1) {
            console.log("element found:-", element.innerText, element.innerText.length)
            clearInterval(interval)
            checkURLchange(currentURL);
        }
    }
}, 1000)

