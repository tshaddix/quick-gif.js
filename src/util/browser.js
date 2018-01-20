const ua = navigator.userAgent.toLowerCase();
const platform = navigator.platform.toLowerCase();
const UA = ua.match(
  /(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/
) || [null, "unknown", 0];
const mode = UA[1] === "ie" && document.documentMode;

const browser = {
  name: UA[1] === "version" ? UA[3] : UA[1],
  version: mode || parseFloat(UA[1] === "opera" && UA[4] ? UA[4] : UA[2]),

  platform: {
    name: ua.match(/ip(?:ad|od|hone)/)
      ? "ios"
      : (ua.match(/(?:webos|android)/) ||
          platform.match(/mac|win|linux/) || ["other"])[0]
  }
};

browser[browser.name] = true;
browser[browser.name + parseInt(browser.version, 10)] = true;
browser.platform[browser.platform.name] = true;

module.exports = browser;
