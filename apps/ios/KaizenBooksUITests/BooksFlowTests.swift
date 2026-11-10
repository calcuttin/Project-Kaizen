import XCTest

final class BooksFlowTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    func testLogReadingPersistsAcrossRelaunch() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO"]
        app.launch()
        app.tabBars.buttons["Reading"].tap()
        XCTAssertTrue(app.buttons["log-The Creative Act"].waitForExistence(timeout: 10))
        app.buttons["log-The Creative Act"].tap()
        let page = app.textFields["page-number"]
        XCTAssertTrue(page.waitForExistence(timeout: 5))
        page.tap(); page.typeText("170")
        app.buttons["save-progress"].tap()
        XCTAssertTrue(app.buttons["reading-The Creative Act"].waitForExistence(timeout: 5))
        app.terminate()
        app.launchArguments = ["--ui-testing", "--keep-test-data", "-onlineBookCovers", "NO"]
        app.launch()
        app.tabBars.buttons["Reading"].tap()
        app.buttons["reading-The Creative Act"].tap()
        XCTAssertTrue(app.staticTexts["Page 170 of 432"].waitForExistence(timeout: 5))
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = "Book detail"; image.lifetime = .keepAlways; add(image)
    }
    func testISBNLookupReviewsBeforeSaving() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--isbn-fixture", "-onlineBookCovers", "NO"]
        app.launch()
        app.buttons["add-book"].tap()
        let isbn = app.textFields["book-isbn"]
        XCTAssertTrue(isbn.waitForExistence(timeout: 5))
        isbn.tap(); isbn.typeText("0140328726")
        app.buttons["lookup-isbn"].tap()
        let use = app.buttons["apply-isbn-details"]
        XCTAssertTrue(use.waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["save-book"].isEnabled, "Lookup must not fill/save without review")
        for _ in 0..<4 { if use.isHittable { break }; app.collectionViews.firstMatch.swipeUp() }
        let preview = XCTAttachment(screenshot: app.screenshot()); preview.name = "ISBN metadata review"; preview.lifetime = .keepAlways; add(preview)
        use.tap()
        let title = app.textFields["book-title"]
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        XCTAssertEqual(title.value as? String, "ISBN preview sample")
        XCTAssertEqual(app.textFields["book-author"].value as? String, "Test author")
        XCTAssertEqual(app.textFields["book-pages"].value as? String, "96")
        app.buttons["save-book"].tap()
        let search = app.textFields["book-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 5)); search.tap(); search.typeText("9780140328721")
        let book = app.buttons.containing(.staticText, identifier: "ISBN preview sample").firstMatch
        XCTAssertTrue(book.waitForExistence(timeout: 5)); book.tap()
        XCTAssertTrue(app.staticTexts["ISBN preview sample"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Test author"].exists)
        XCTAssertTrue(app.staticTexts["Page 0 of 96"].exists)
    }
    func testScannerFallbackAndInvalidISBNKeepManualEntry() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO"]
        app.launch()
        app.buttons["add-book"].tap()
        let isbn = app.textFields["book-isbn"]
        XCTAssertTrue(isbn.waitForExistence(timeout: 5))
        isbn.tap(); isbn.typeText("9780140328722")
        app.buttons["lookup-isbn"].tap()
        XCTAssertTrue(app.staticTexts["isbn-message"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["save-book"].isEnabled)
        app.buttons["scan-isbn"].tap()
        XCTAssertTrue(app.buttons["Enter ISBN manually"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.otherElements["scanner-unavailable"].exists || app.staticTexts["Scanner unavailable"].exists)
        let proof = XCTAttachment(screenshot: app.screenshot()); proof.name = "Scanner manual fallback"; proof.lifetime = .keepAlways; add(proof)
        app.buttons["Enter ISBN manually"].tap()
        XCTAssertTrue(isbn.waitForExistence(timeout: 5))
        XCTAssertEqual(isbn.value as? String, "9780140328722")
        app.buttons["Cancel"].tap()
        XCTAssertTrue(app.textFields["book-search"].waitForExistence(timeout: 5))
    }
    func testAddSearchAndDeleteBook() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO"]
        app.launch()
        app.buttons["add-book"].tap()
        let isbn = app.textFields["book-isbn"]
        XCTAssertTrue(isbn.waitForExistence(timeout: 5)); isbn.tap(); isbn.typeText("0-14-032872-6")
        let title = app.textFields["book-title"]
        XCTAssertTrue(title.waitForExistence(timeout: 5)); title.tap(); title.typeText("Prototype book")
        app.textFields["book-author"].tap(); app.textFields["book-author"].typeText("A reader")
        app.textFields["book-pages"].tap(); app.textFields["book-pages"].typeText("200")
        app.buttons["save-book"].tap()
        app.tabBars.buttons["Bookshelf"].tap()
        let search = app.textFields["book-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 5)); search.tap(); search.typeText("9780140328721")
        let book = app.buttons.containing(.staticText, identifier: "Prototype book").firstMatch
        XCTAssertTrue(book.waitForExistence(timeout: 5)); book.tap()
        XCTAssertTrue(app.navigationBars["Book details"].waitForExistence(timeout: 5))
        let delete = app.buttons["Delete book"]
        for _ in 0..<5 { if delete.exists && delete.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(delete.isHittable)
        delete.tap()
        app.sheets.buttons["Delete book"].tap()
        XCTAssertTrue(app.staticTexts["No books here yet"].waitForExistence(timeout: 5))
    }
    func testHomeAndJournalScreens() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO"]
        app.launch()
        app.tabBars.buttons["Reading"].tap()
        XCTAssertTrue(app.buttons["log-The Creative Act"].waitForExistence(timeout: 10))
        let home = XCTAttachment(screenshot: app.screenshot()); home.name = "Reading home"; home.lifetime = .keepAlways; add(home)
        app.tabBars.buttons["Journal"].tap()
        XCTAssertTrue(app.staticTexts["Your reading journal"].waitForExistence(timeout: 5))
        let journal = XCTAttachment(screenshot: app.screenshot()); journal.name = "Reading journal"; journal.lifetime = .keepAlways; add(journal)
        app.tabBars.buttons["Bookshelf"].tap()
        XCTAssertTrue(app.textFields["book-search"].waitForExistence(timeout: 5))
        let shelf = XCTAttachment(screenshot: app.screenshot()); shelf.name = "Bookshelf"; shelf.lifetime = .keepAlways; add(shelf)
    }
    func testLargeTextReadingFlow() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        app.tabBars.buttons["Reading"].tap()
        let log = app.buttons["log-The Creative Act"]
        XCTAssertTrue(log.waitForExistence(timeout: 10))
        for _ in 0..<5 { if log.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(log.isHittable)
        let capture = XCTAttachment(screenshot: app.screenshot()); capture.name = "Large text reading"; capture.lifetime = .keepAlways; add(capture)
        log.tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 5))
        let page = app.textFields["page-number"]
        for _ in 0..<4 { if page.exists && page.isHittable { break }; app.collectionViews.firstMatch.swipeUp() }
        XCTAssertTrue(page.isHittable)
        app.buttons["Cancel"].tap()
        app.tabBars.buttons["Journal"].tap()
        XCTAssertTrue(app.buttons["Edit"].waitForExistence(timeout: 5))
    }

    func testWebStyleShelvesGridAndMarkRead() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO"]
        app.launch()
        XCTAssertTrue(app.textFields["book-search"].waitForExistence(timeout: 10))
        let shelf = app.buttons["shelf-A Psalm for the Wild-Built"]
        for _ in 0..<4 { if shelf.exists && shelf.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(shelf.isHittable)
        let cabinet = XCTAttachment(screenshot: app.screenshot()); cabinet.name = "Native wooden bookshelf"; cabinet.lifetime = .keepAlways; add(cabinet)
        shelf.tap()
        XCTAssertTrue(app.navigationBars["Book details"].waitForExistence(timeout: 5))
        app.navigationBars.buttons.element(boundBy: 0).tap()
        for _ in 0..<4 { if app.buttons["Grid"].isHittable { break }; app.swipeDown() }
        app.buttons["Grid"].tap()
        let gridBook = app.buttons["grid-The Creative Act"]
        for _ in 0..<4 { if gridBook.exists && gridBook.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(gridBook.isHittable)
        let grid = XCTAttachment(screenshot: app.screenshot()); grid.name = "Book grid"; grid.lifetime = .keepAlways; add(grid)
        for _ in 0..<4 { if app.buttons["Mark read"].isHittable { break }; app.swipeDown() }
        app.buttons["Mark read"].tap()
        for _ in 0..<4 { if gridBook.isHittable { break }; app.swipeUp() }
        gridBook.tap()
        XCTAssertTrue(app.buttons["grid-The Creative Act"].staticTexts["Finished"].waitForExistence(timeout: 5))
    }

}
