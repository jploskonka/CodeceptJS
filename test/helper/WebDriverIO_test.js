const TestHelper = require('../support/TestHelper');

const WebDriverIO = require('../../lib/helper/WebDriverIO');

let wd;
const siteUrl = TestHelper.siteUrl();
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const fileExists = require('../../lib/utils').fileExists;
const AssertionFailedError = require('../../lib/assert/error');
const webApiTests = require('./webapi');

describe('WebDriverIO', function () {
  this.retries(3);
  this.timeout(35000);

  before(() => {
    global.codecept_dir = path.join(__dirname, '/../data');
    try {
      fs.unlinkSync(dataFile);
    } catch (err) {
      // continue regardless of error
    }

    wd = new WebDriverIO({
      url: siteUrl,
      browser: 'chrome',
      windowSize: '500x700',
      smartWait: 0, // just to try
      host: TestHelper.seleniumHost(),
      port: TestHelper.seleniumPort(),
      waitForTimeout: 5000,
    });
  });

  beforeEach(() => {
    webApiTests.init({ I: wd, siteUrl });
    return wd._before();
  });

  afterEach(() => wd._after());

  // load common test suite
  webApiTests.tests();

  describe('open page : #amOnPage', () => {
    it('should open main page of configured site', () => wd.amOnPage('/').getUrl().then(url => url.should.eql(`${siteUrl}/`)));

    it('should open any page of configured site', () => wd.amOnPage('/info').getUrl().then(url => url.should.eql(`${siteUrl}/info`)));

    it('should open absolute url', () => wd.amOnPage(siteUrl).getUrl().then(url => url.should.eql(`${siteUrl}/`)));
  });

  describe('see text : #see', () => {
    it('should fail when text is not on site', () => wd.amOnPage('/')
      .then(() => wd.see('Something incredible!'))
      .catch((e) => {
        e.should.be.instanceOf(AssertionFailedError);
        e.inspect().should.include('web page');
      })
      .then(() => wd.dontSee('Welcome'))
      .catch((e) => {
        e.should.be.instanceOf(AssertionFailedError);
        e.inspect().should.include('web page');
      }));
  });

  describe('check fields: #seeInField, #seeCheckboxIsChecked, ...', () => {
    it('should throw error if field is not empty', () => wd.amOnPage('/form/empty')
      .then(() => wd.seeInField('#empty_input', 'Ayayay'))
      .catch((e) => {
        e.should.be.instanceOf(AssertionFailedError);
        e.inspect().should.be.equal('expected fields by #empty_input to include "Ayayay"');
      }));

    it('should check values in checkboxes', function* () {
      yield wd.amOnPage('/form/field_values');
      yield wd.dontSeeInField('checkbox[]', 'not seen one');
      yield wd.seeInField('checkbox[]', 'see test one');
      yield wd.dontSeeInField('checkbox[]', 'not seen two');
      yield wd.seeInField('checkbox[]', 'see test two');
      yield wd.dontSeeInField('checkbox[]', 'not seen three');
      return wd.seeInField('checkbox[]', 'see test three');
    });

    it('should check values with boolean', function* () {
      yield wd.amOnPage('/form/field_values');
      yield wd.seeInField('checkbox1', true);
      yield wd.dontSeeInField('checkbox1', false);
      yield wd.seeInField('checkbox2', false);
      yield wd.dontSeeInField('checkbox2', true);
      yield wd.seeInField('radio2', true);
      yield wd.dontSeeInField('radio2', false);
      yield wd.seeInField('radio3', false);
      return wd.dontSeeInField('radio3', true);
    });

    it('should check values in radio', function* () {
      yield wd.amOnPage('/form/field_values');
      yield wd.seeInField('radio1', 'see test one');
      yield wd.dontSeeInField('radio1', 'not seen one');
      yield wd.dontSeeInField('radio1', 'not seen two');
      return wd.dontSeeInField('radio1', 'not seen three');
    });

    it('should check values in select', function* () {
      yield wd.amOnPage('/form/field_values');
      yield wd.seeInField('select1', 'see test one');
      yield wd.dontSeeInField('select1', 'not seen one');
      yield wd.dontSeeInField('select1', 'not seen two');
      return wd.dontSeeInField('select1', 'not seen three');
    });

    it('should check for empty select field', function* () {
      yield wd.amOnPage('/form/field_values');
      return wd.seeInField('select3', '');
    });

    it('should check for select multiple field', function* () {
      yield wd.amOnPage('/form/field_values');
      yield wd.dontSeeInField('select2', 'not seen one');
      yield wd.seeInField('select2', 'see test one');
      yield wd.dontSeeInField('select2', 'not seen two');
      yield wd.seeInField('select2', 'see test two');
      yield wd.dontSeeInField('select2', 'not seen three');
      return wd.seeInField('select2', 'see test three');
    });
  });

  describe('#pressKey', () => {
    it('should be able to send special keys to element', function* () {
      yield wd.amOnPage('/form/field');
      yield wd.appendField('Name', '-');
      yield wd.pressKey(['Control', 'a']);
      yield wd.pressKey('Delete');
      yield wd.pressKey(['Shift', '111']);
      yield wd.pressKey('1');
      return wd.seeInField('Name', '!!!1');
    });
  });

  describe('#seeInSource', () => {
    it('should check for text to be in HTML source', () => wd.amOnPage('/')
      .then(() => wd.seeInSource('<title>TestEd Beta 2.0</title>'))
      .then(() => wd.dontSeeInSource('<meta')));
  });

  describe('#seeAttributesOnElements', () => {
    it('should check attributes values for given element', () => wd.amOnPage('/info')
      .then(() => wd.seeAttributesOnElements('//form', {
        method: 'post',
      }))
      .then(() => wd.seeAttributesOnElements('//form', {
        method: 'post',
        action: `${siteUrl}/`,
      }))
      .then(() => wd.seeAttributesOnElements('//form', {
        method: 'get',
      }))
      .catch((e) => {
        assert.equal(e.message, 'Not all elements (//form) have attributes {"method":"get"}');
      }));

    it('should check attributes values for several elements', () => wd.amOnPage('/')
      .then(() => wd.seeAttributesOnElements('a', {
        'qa-id': 'test',
        'qa-link': 'test',
      }))
      .then(() => wd.seeAttributesOnElements('//div', {
        'qa-id': 'test',
      }))
      .then(() => wd.seeAttributesOnElements('a', {
        'qa-id': 'test',
        href: '/info',
      }))
      .catch((e) => {
        e.message.should.include('Not all elements (a) have attributes {"qa-id":"test","href":"/info"}');
      }));
  });

  describe('#seeTitleEquals', () => {
    it('should check that title is equal to provided one', () => wd.amOnPage('/')
      .then(() => wd.seeTitleEquals('TestEd Beta 2.0'))
      .then(() => wd.seeTitleEquals('TestEd Beta 2.'))
      .catch((e) => {
        assert.equal(e.message, 'expected web page title to be TestEd Beta 2., but found TestEd Beta 2.0');
      }));
  });

  describe('#seeTextEquals', () => {
    it('should check text is equal to provided one', () => wd.amOnPage('/')
      .then(() => wd.seeTextEquals('Welcome to test app!', 'h1'))
      .then(() => wd.seeTextEquals('Welcome to test app', 'h1'))
      .catch((e) => {
        e.should.be.instanceOf(AssertionFailedError);
        e.inspect().should.include("expected element h1 'Welcome to test app' to equal 'Welcome to test app!'");
      }));
  });

  describe('#grabCssPropertyFrom', () => {
    it('should grab css property for given element', () => wd.amOnPage('/form/doubleclick')
      .then(() => wd.grabCssPropertyFrom('#block', 'height'))
      .then(css => assert.equal(css, '100px')));
  });

  describe('#seeCssPropertiesOnElements', () => {
    it('should check css property for given element', () => wd.amOnPage('/info')
      .then(() => wd.seeCssPropertiesOnElements('h3', {
        'font-weight': 'bold',
      }))
      .then(() => wd.seeCssPropertiesOnElements('h3', {
        'font-weight': 'bold',
        display: 'block',
      }))
      .then(() => wd.seeCssPropertiesOnElements('h3', {
        'font-weight': 'non-bold',
      }))
      .catch((e) => {
        e.message.should.include('Not all elements (h3) have CSS property {"font-weight":"non-bold"}');
      }));

    it('should check css property for several elements', () => wd.amOnPage('/')
      .then(() => wd.seeCssPropertiesOnElements('a', {
        color: 'rgba(0, 0, 238, 1)',
        cursor: 'auto',
      }))
      .then(() => wd.seeCssPropertiesOnElements('//div', {
        display: 'block',
      }))
      .then(() => wd.seeCssPropertiesOnElements('a', {
        'margin-top': '0em',
        cursor: 'auto',
      }))
      .catch((e) => {
        e.message.should.include('Not all elements (a) have CSS property {"margin-top":"0em","cursor":"auto"}');
      }));
  });


  describe('#seeNumberOfVisibleElements', () => {
    it('should check number of visible elements for given locator', () => wd.amOnPage('/info')
      .then(() => wd.seeNumberOfVisibleElements('//div[@id = "grab-multiple"]//a', 3)));
  });

  describe('#grabNumberOfVisibleElements', () => {
    it('should grab number of visible elements for given locator', () => wd.amOnPage('/info')
      .then(() => wd.grabNumberOfVisibleElements('//div[@id = "grab-multiple"]//a'))
      .then(num => assert.equal(num, 3)));
    it('should support locators like {xpath:"//div"}', () => wd.amOnPage('/info')
      .then(() => wd.grabNumberOfVisibleElements({
        xpath: '//div[@id = "grab-multiple"]//a',
      }))
      .then(num => assert.equal(num, 3)));
  });

  describe('#waitInUrl, #waitUrlEquals', () => {
    it('should wait part of the URL to match the expected', () => wd.amOnPage('/info')
      .then(() => wd.waitInUrl('/info'))
      .then(() => wd.waitInUrl('/info2', 0.1))
      .catch((e) => {
        assert.equal(e.message, `expected url to include /info2, but found ${siteUrl}/info`);
      }));
    it('should wait for the entire URL to match the expected', () => wd.amOnPage('/info')
      .then(() => wd.waitUrlEquals('/info'))
      .then(() => wd.waitUrlEquals(`${siteUrl}/info`))
      .then(() => wd.waitUrlEquals('/info2', 0.1))
      .catch((e) => {
        assert.equal(e.message, `expected url to be ${siteUrl}/info2, but found ${siteUrl}/info`);
      }));
  });

  describe('#saveScreenshot', () => {
    beforeEach(() => {
      global.output_dir = path.join(global.codecept_dir, 'output');
    });

    it('should create a screenshot on fail  @ups', () => {
      const sec = (new Date()).getUTCMilliseconds().toString();
      const test = {
        title: `sw should do smth ${sec}`,
      };
      return wd.amOnPage('/')
        .then(() => wd._failed(test))
        .then(() => assert.ok(fileExists(path.join(output_dir, `sw_should_do_smth_${sec}.failed.png`)), null, 'file does not exists'));
    });
  });

  describe('#waitForValue', () => {
    it('should wait for expected value for given locator', () => wd.amOnPage('/info')
      .then(() => wd.waitForValue('//input[@name= "rus"]', 'Верно'))
      .then(() => wd.waitForValue('//input[@name= "rus"]', 'Верно3', 0.1))
      .catch((e) => {
        assert.equal(e.message, 'element (//input[@name= "rus"]) is not in DOM or there is no element(//input[@name= "rus"]) with value "Верно3" after 0.1 sec');
      }));
  });

  describe('#waitNumberOfVisibleElements', () => {
    it('should wait for a specified number of elements on the page', () => wd.amOnPage('/info')
      .then(() => wd.waitNumberOfVisibleElements('//div[@id = "grab-multiple"]//a', 3))
      .then(() => wd.waitNumberOfVisibleElements('//div[@id = "grab-multiple"]//a', 2, 0.1))
      .catch((e) => {
        assert.equal(e.message, 'The number of elements //div[@id = "grab-multiple"]//a is not 2 after 0.1 sec');
      }));
  });

  describe('#switchToNextTab, #switchToPreviousTab, #openNewTab, #closeCurrentTab', () => {
    it('should switch to next tab', () => wd.amOnPage('/info')
      .then(() => wd.click('New tab'))
      .then(() => wd.switchToNextTab())
      .then(() => wd.waitInUrl('/login')));
    it('should assert when there is no ability to switch to next tab', () => wd.amOnPage('/')
      .then(() => wd.click('More info'))
      .then(() => wd.switchToNextTab(2))
      .catch((e) => {
        assert.equal(e.message, 'There is no ability to switch to next tab with offset 2');
      }));
    it('should close current tab', () => wd.amOnPage('/info')
      .then(() => wd.click('New tab'))
      .then(() => wd.switchToNextTab())
      .then(() => wd.waitInUrl('/login'))
      .then(() => wd.closeCurrentTab())
      .then(() => wd.waitInUrl('/info')));
    it('should open new tab', () => wd.amOnPage('/info')
      .then(() => wd.openNewTab())
      .then(() => wd.waitInUrl('about:blank')));
    it('should switch to previous tab', () => wd.amOnPage('/info')
      .then(() => wd.openNewTab())
      .then(() => wd.waitInUrl('about:blank'))
      .then(() => wd.switchToPreviousTab())
      .then(() => wd.waitInUrl('/info')));
    it('should assert when there is no ability to switch to previous tab', () => wd.amOnPage('/info')
      .then(() => wd.openNewTab())
      .then(() => wd.waitInUrl('about:blank'))
      .then(() => wd.switchToPreviousTab(2))
      .then(() => wd.waitInUrl('/info'))
      .catch((e) => {
        assert.equal(e.message, 'There is no ability to switch to previous tab with offset 2');
      }));
  });

  describe('popup : #acceptPopup, #seeInPopup, #cancelPopup', () => {
    it('should accept popup window', () => wd.amOnPage('/form/popup')
      .then(() => wd.click('Confirm'))
      .then(() => wd.acceptPopup())
      .then(() => wd.see('Yes', '#result')));

    it('should cancel popup', () => wd.amOnPage('/form/popup')
      .then(() => wd.click('Confirm'))
      .then(() => wd.cancelPopup())
      .then(() => wd.see('No', '#result')));

    it('should check text in popup', () => wd.amOnPage('/form/popup')
      .then(() => wd.click('Alert'))
      .then(() => wd.seeInPopup('Really?'))
      .then(() => wd.cancelPopup()));

    it('should grab text from popup', () => wd.amOnPage('/form/popup')
      .then(() => wd.click('Alert'))
      .then(() => wd.grabPopupText())
      .then(text => assert.equal(text, 'Really?')));

    it('should return null if no popup is visible (do not throw an error)', () => wd.amOnPage('/form/popup')
      .then(() => wd.grabPopupText())
      .then(text => assert.equal(text, null)));
  });

  describe('#waitForText', () => {
    it('should return error if not present', () => wd.amOnPage('/dynamic')
      .then(() => wd.waitForText('Nothing here', 1, '#text'))
      .catch((e) => {
        e.message.should.be.equal('element (#text) is not in DOM or there is no element(#text) with text "Nothing here" after 1 sec');
      }));

    it('should return error if waiting is too small', () => wd.amOnPage('/dynamic')
      .then(() => wd.waitForText('Dynamic text', 0.1))
      .catch((e) => {
        e.message.should.be.equal('element (body) is not in DOM or there is no element(body) with text "Dynamic text" after 0.1 sec');
      }));
  });

  describe('#seeNumberOfElements', () => {
    it('should return 1 as count', () => wd.amOnPage('/')
      .then(() => wd.seeNumberOfElements('#area1', 1)));
  });

  describe('#switchTo', () => {
    it('should switch reference to iframe content', () => wd.amOnPage('/iframe')
      .then(() => wd.switchTo('[name="content"]'))
      .then(() => wd.see('Information\nLots of valuable data here')));

    it('should return error if iframe selector is invalid', () => wd.amOnPage('/iframe')
      .then(() => wd.switchTo('#invalidIframeSelector'))
      .catch((e) => {
        e.should.be.instanceOf(Error);
        e.message.should.be.equal('Element #invalidIframeSelector was not found by text|CSS|XPath');
      }));

    it('should return error if iframe selector is not iframe', () => wd.amOnPage('/iframe')
      .then(() => wd.switchTo('h1'))
      .catch((e) => {
        e.should.be.instanceOf(Error);
        e.seleniumStack.type.should.be.equal('NoSuchFrame');
      }));

    it('should return to parent frame given a null locator', () => wd.amOnPage('/iframe')
      .then(() => wd.switchTo('[name="content"]'))
      .then(() => wd.see('Information\nLots of valuable data here'))
      .then(() => wd.switchTo(null))
      .then(() => wd.see('Iframe test')));
  });

  describe('click context', () => {
    it('should click on inner text', () => wd.amOnPage('/form/checkbox')
      .then(() => wd.click('Submit', '//input[@type = "submit"]'))
      .then(() => wd.waitInUrl('/form/complex')));
    it('should click on input in inner element', () => wd.amOnPage('/form/checkbox')
      .then(() => wd.click('Submit', '//form'))
      .then(() => wd.waitInUrl('/form/complex')));

    it('should click by accessibility_id', () => wd.amOnPage('/info')
      .then(() => wd.click('~index'))
      .then(() => wd.see('Welcome to test app!')));
  });

  describe('window size #resizeWindow', () => {
    it('should set initial window size', () => wd.amOnPage('/form/resize')
      .then(() => wd.click('Window Size'))
      .then(() => wd.see('Height 700', '#height'))
      .then(() => wd.see('Width 500', '#width')));

    it('should resize window to specific dimensions', () => wd.amOnPage('/form/resize')
      .then(() => wd.resizeWindow(950, 600))
      .then(() => wd.click('Window Size'))
      .then(() => wd.see('Height 600', '#height'))
      .then(() => wd.see('Width 950', '#width')));
  });

  describe('SmartWait', () => {
    before(() => wd.options.smartWait = 3000);
    after(() => wd.options.smartWait = 0);

    it('should wait for element to appear', () => wd.amOnPage('/form/wait_element')
      .then(() => wd.dontSeeElement('h1'))
      .then(() => wd.seeElement('h1')));

    it('should wait for clickable element appear', () => wd.amOnPage('/form/wait_clickable')
      .then(() => wd.dontSeeElement('#click'))
      .then(() => wd.click('#click'))
      .then(() => wd.see('Hi!')));

    it('should wait for clickable context to appear', () => wd.amOnPage('/form/wait_clickable')
      .then(() => wd.dontSeeElement('#linkContext'))
      .then(() => wd.click('Hello world', '#linkContext'))
      .then(() => wd.see('Hi!')));

    it('should wait for text context to appear', () => wd.amOnPage('/form/wait_clickable')
      .then(() => wd.dontSee('Hello world'))
      .then(() => wd.see('Hello world', '#linkContext')));

    it('should work with grabbers', () => wd.amOnPage('/form/wait_clickable')
      .then(() => wd.dontSee('Hello world'))
      .then(() => wd.grabAttributeFrom('#click', 'id'))
      .then(res => assert.equal(res, 'click')));
  });

  describe('#_locateClickable', () => {
    it('should locate a button to click', () => wd.amOnPage('/form/checkbox')
      .then(() => wd._locateClickable('Submit'))
      .then((res) => {
        res.length.should.be.equal(1);
      }));

    it('should not locate a non-existing checkbox', () => wd.amOnPage('/form/checkbox')
      .then(() => wd._locateClickable('I disagree'))
      .then(res => res.length.should.be.equal(0)));
  });


  describe('#_locateCheckable', () => {
    it('should locate a checkbox', () => wd.amOnPage('/form/checkbox')
      .then(() => wd._locateCheckable('I Agree'))
      .then(res => res.length.should.be.equal(1)));

    it('should not locate a non-existing checkbox', () => wd.amOnPage('/form/checkbox')
      .then(() => wd._locateCheckable('I disagree'))
      .then(res => res.length.should.be.equal(0)));
  });

  describe('#_locateFields', () => {
    it('should locate a field', () => wd.amOnPage('/form/field')
      .then(() => wd._locateFields('Name'))
      .then(res => res.length.should.be.equal(1)));

    it('should not locate a non-existing field', () => wd.amOnPage('/form/field')
      .then(() => wd._locateFields('Mother-in-law'))
      .then(res => res.length.should.be.equal(0)));
  });
});
