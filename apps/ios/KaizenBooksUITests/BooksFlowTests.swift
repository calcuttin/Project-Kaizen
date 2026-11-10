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

    func testAppleIICommandsAndKeyboard() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO"]
        app.launch()
        app.buttons["Open Apple II"].tap()
        XCTAssertTrue(app.staticTexts["APPLE II · KAIZEN EDITION"].waitForExistence(timeout: 5))
        app.buttons["Run"].tap()
        XCTAssertTrue(app.staticTexts["WELCOME TO KAIZEN"].waitForExistence(timeout: 5))
        let input = app.textFields["basic-command"]
        XCTAssertTrue(input.waitForExistence(timeout: 5))
        input.tap(); input.typeText("PRINT 6 * 7")
        app.buttons["basic-send"].tap()
        XCTAssertTrue(app.staticTexts["42"].waitForExistence(timeout: 5))
        app.buttons["Previous command"].tap()
        XCTAssertEqual(input.value as? String, "PRINT 6 * 7")
        let proof = XCTAttachment(screenshot: app.screenshot()); proof.name = "Apple II playground"; proof.lifetime = .keepAlways; add(proof)
        app.buttons["Done"].tap()
        XCTAssertTrue(app.textFields["book-search"].waitForExistence(timeout: 5))
    }

    func testCreateStyleRenameAndRemoveEmptyShelf() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO"]
        app.launch()
        let manage = app.buttons["Manage shelves"]
        for _ in 0..<4 { if manage.isHittable { break }; app.swipeUp() }
        manage.tap(); app.buttons["Create shelf"].tap()
        let name = app.textFields["shelf-name"]
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("Tech room")
        app.buttons["Theme, Automatic from name"].tap(); app.buttons["Tech & founders"].tap()
        app.buttons["Layout, Layered"].tap(); app.buttons["Balanced"].tap()
        app.buttons["Lighting, Gallery"].tap(); app.buttons["Moonlight"].tap()
        app.buttons["save-shelf"].tap()
        let row = app.buttons.containing(.staticText, identifier: "Tech room").firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 5)); row.tap()
        let computer = app.buttons["apple-ii"]
        for _ in 0..<7 { if computer.exists && computer.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(computer.isHittable)
        let proof = XCTAttachment(screenshot: app.screenshot()); proof.name = "Shelf cabinet controls"; proof.lifetime = .keepAlways; add(proof)
        computer.tap()
        XCTAssertTrue(app.staticTexts["APPLE II · KAIZEN EDITION"].waitForExistence(timeout: 5))
        app.navigationBars["Apple II"].buttons["Done"].tap()
        for _ in 0..<7 { if name.isHittable { break }; app.swipeDown() }
        name.tap(); name.typeText(" renamed")
        app.buttons["save-shelf"].tap()
        let renamed = app.buttons.containing(.staticText, identifier: "Tech room renamed").firstMatch
        XCTAssertTrue(renamed.waitForExistence(timeout: 5))
        app.navigationBars["Manage shelves"].buttons["Done"].tap()
        // Empty shelf remains in the shelf filter, even with no books assigned.
        for _ in 0..<7 { if app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'All shelves'")).firstMatch.isHittable { break }; app.swipeDown() }
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'All shelves'")).firstMatch.tap()
        app.buttons["Tech room renamed"].tap()
        XCTAssertTrue(app.staticTexts["0 books · 0 read"].waitForExistence(timeout: 5))
        for _ in 0..<5 { if manage.isHittable { break }; app.swipeDown() }
        manage.tap(); renamed.tap()
        let remove = app.buttons["Remove shelf"]
        for _ in 0..<8 { if remove.exists && remove.isHittable { break }; app.swipeUp() }
        remove.tap(); app.buttons["Remove shelf, keep books"].tap()
        XCTAssertFalse(renamed.exists)
        app.navigationBars["Manage shelves"].buttons["Done"].tap()
        XCTAssertTrue(app.textFields["book-search"].waitForExistence(timeout: 5))
    }

    func testDailyGoalAndJournalNavigation() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-onlineBookCovers", "NO"]
        app.launch(); app.tabBars.buttons["Journal"].tap(); app.buttons["Edit"].tap()
        let goal = app.textFields["daily-goal"]
        for _ in 0..<5 { if goal.exists && goal.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(goal.isHittable); goal.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap(); goal.typeText(XCUIKeyboardKey.delete.rawValue + "25")
        XCTAssertEqual(goal.value as? String, "25")
        app.navigationBars["Make it your own"].buttons["Save"].tap()
        XCTAssertTrue(app.staticTexts["25 pages a day to aim for"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["42 pages"].firstMatch.exists)
        let session = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'journal-'")).firstMatch
        for _ in 0..<4 { if session.isHittable { break }; app.swipeUp() }
        session.tap(); XCTAssertTrue(app.navigationBars["Book details"].waitForExistence(timeout: 5))
    }

}
