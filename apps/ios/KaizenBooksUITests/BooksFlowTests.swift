import XCTest

final class BooksFlowTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    func testLogReadingPersistsAcrossRelaunch() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
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
        app.launchArguments = ["--ui-testing", "--keep-test-data"]
        app.launch()
        app.tabBars.buttons["Reading"].tap()
        app.buttons["reading-The Creative Act"].tap()
        XCTAssertTrue(app.staticTexts["Page 170 of 432"].waitForExistence(timeout: 5))
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = "Book detail"; image.lifetime = .keepAlways; add(image)
    }
    func testAddSearchAndDeleteBook() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        app.buttons["add-book"].tap()
        let title = app.textFields["book-title"]
        XCTAssertTrue(title.waitForExistence(timeout: 5)); title.tap(); title.typeText("Prototype book")
        app.textFields["book-author"].tap(); app.textFields["book-author"].typeText("A reader")
        app.textFields["book-pages"].tap(); app.textFields["book-pages"].typeText("200")
        app.buttons["save-book"].tap()
        app.tabBars.buttons["Bookshelf"].tap()
        let search = app.textFields["book-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 5)); search.tap(); search.typeText("Prototype book")
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
        app.launchArguments = ["--ui-testing"]
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
        app.launchArguments = ["--ui-testing", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
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
        app.launchArguments = ["--ui-testing"]
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
