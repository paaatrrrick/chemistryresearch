function convertToDs(time) {
    try {
        if (time.length === 9) {
            let hours = parseInt(time.substring(0, 1));
            let minutes = parseInt(time.substring(2, 4));
            let seconds = parseInt(time.substring(5, 7));
            let dilliseconds = parseInt(time.substring(8, 9));
            let ds = hours * 36000 + minutes * 600 + seconds * 10 + dilliseconds;
            return ds;
        } else {
            let minutes = time.getMinutes();
            let seconds = time.getSeconds();
            let milliseconds = time.getMilliseconds();
            let ds = minutes * 600 + seconds * 10 + Math.round(milliseconds / 100);
            return ds;
        }
    } catch (error) {
        console.error(error);
        return 0;
    }
}

function convertSecondsToDs(time) {
    let ds = time * 10;
    return ds;
}


function convertToTime(ds) {
    let time = '';
    let hours = Math.floor(ds / 36000);
    let minutes = Math.floor((ds - hours * 36000) / 600);
    let seconds = Math.floor((ds - hours * 36000 - minutes * 600) / 10);
    if (seconds < 10) {
        seconds = '0' + seconds;
    }
    time = minutes + ':' + seconds
    return time;
}

function createDiamondPoints(x, y, width, height) {
    let points = [
        { x: x - width / 2, y: y },
        { x: x, y: y - height / 2 },
        { x: x + width / 2, y: y },
        { x: x, y: y + height / 2 },
    ];
    return points;
}

const createWideHexagonPoints = (x, y, width, height) => {
    let points = [
        { x: x - width / 2, y: y },
        { x: x - width / 2 + constants.minWidthPixels / 6, y: y + height / 2 },
        { x: x + width / 2 - constants.minWidthPixels / 6, y: y + height / 2 },
        { x: x + width / 2, y: y },
        { x: x + width / 2 - constants.minWidthPixels / 6, y: y - height / 2 },
        { x: x - width / 2 + constants.minWidthPixels / 6, y: y - height / 2 },
    ];
    return points;
};

const badData = {};

function createShapes(canvas, data, dToP) {
    //check if data is in codeToSpecs
    if (codeToSpecs[data[constants.codeIndex]] && !Array.isArray(codeToSpecs[data[constants.codeIndex]])) {
        let spec = codeToSpecs[data[constants.codeIndex]];
        let width = Math.max(constants.minWidthPixels, (data[constants.endTimeIndex] - data[constants.startTimeIndex]) * dToP);
        let x = data[constants.startTimeIndex] * dToP;
        let y = constants.imageHeight * constants.middle - constants.imageHeight * spec.height * 0.5;
        let borderRect;
        switch (spec.shape) {
            case shapes.bottomLine:
                borderRect = new fabric.Rect({ left: x, top: constants.imageHeight * constants.middle + constants.imageHeight * constants.bigHeight / 4, width: width, height: spec.height, fill: spec.color, selectable: false, });
                break;
            case shapes.borderRect:
                borderRect = new fabric.Rect({ left: x, top: y, width: width, height: constants.imageHeight * spec.height, fill: spec.color, stroke: spec.borderColor ? spec.borderColor : spec.color, strokeWidth: 4, selectable: false, });
                break;
            case shapes.square:
                borderRect = new fabric.Rect({ left: x, top: y, width: width, height: constants.imageHeight * spec.height, fill: spec.color, stroke: colors.lightGray, strokeWidth: 1, selectable: false, });
                break;
            case shapes.circle:
                y = constants.imageHeight * constants.middle - constants.imageHeight * spec.height * 0.5;
                borderRect = new fabric.Ellipse({ left: x, top: y, ry: constants.imageHeight * spec.height / 2, rx: width / 2, fill: spec.color, stroke: colors.lightGray, strokeWidth: 1, selectable: false, });
                break;
            case shapes.triangle:
                borderRect = new fabric.Triangle({ left: x, top: y, width: width, height: constants.imageHeight * spec.height, fill: spec.color, stroke: colors.lightGray, strokeWidth: 1, selectable: false, });
                break;
            case shapes.diamond:
                let points = createDiamondPoints(x, y, width, constants.imageHeight * spec.height);
                var polygon = new fabric.Polygon(points, {
                    left: x,
                    top: y,
                    fill: spec.color,
                    stroke: colors.lightGray,
                });
                canvas.add(polygon);
            case shapes.hexagon:
                const hexPoints = createWideHexagonPoints(x, y, width, constants.imageHeight * spec.height);
                var polygon = new fabric.Polygon(hexPoints, {
                    left: x,
                    top: y,
                    fill: spec.color,
                    stroke: colors.lightGray,
                });
                canvas.add(polygon);
                break;
            case shapes.picture:
                let height = constants.imageHeight * constants.midHeight;
                x = x + ((data[constants.endTimeIndex] - data[constants.startTimeIndex]) / 2 * dToP) - spec.shapeType[1] / 2;
                y = constants.imageHeight * constants.middle - constants.imageHeight * constants.bigHeight / 2 - constants.imageHeight * constants.midHeight;
                fabric.Image.fromURL(spec.shapeType[0], function (oImg) {
                    oImg.set({ left: x, top: y - spec.marginBottom, width: height, height: height, selectable: false, });
                    canvas.add(oImg);
                });
                break;
            default:
                console.log('');
                console.log('cannot find shape');
                console.log(data)
                break;
        }
        if (borderRect) {
            canvas.add(borderRect);
        }
    } else {
        console.log('');
        console.log(data);
        console.log('shape not found top');
    }
}




// import readXlsxFile from 'read-excel-file'

const input = document.getElementById('input')

input.addEventListener('change', () => {
    function logTabsForWindows(windowInfoArray) {
        for (const windowInfo of windowInfoArray) {
            console.log(`Window: ${windowInfo.id}`);
            console.log(windowInfo.tabs.map((tab) => tab.url));
        }
    }
    //access the dom element for width input and get its vcalue
    constants.imageWidth = parseInt(document.getElementById('width').value);
    constants.secondsPerCheck = convertSecondsToDs(parseInt(document.getElementById('seconds').value));
    constants.checkInterval = parseInt(document.getElementById('checkInterval').value);

    browser.windows
        .getAll({
            populate: true,
            windowTypes: ["normal"],
        })
        .then(logTabsForWindows, onError);

    readXlsxFile(input.files[0]).then((rows) => {
        let startTimes = [];
        let endTimes = [];
        let minTime = 0;
        let maxTime = 0;
        let dsToPx = 0;
        //create an array of objects for each key in codeToSpecs and its shape and color
        let myCoolArray = []
        let i = 0;
        for (let key in codeToSpecs) {
            if (i > 45) {
                myCoolArray.push({ Key: key, Shape: codeToSpecs[key].shape, color: codeToSpecs[key].color })
            }
            i++;
        }
        for (let i = 0; i < constants.rowsToShift; i++) {
            rows.shift();
        };
        for (let i = 0; i < rows.length; i++) {
            codeToSpecs[rows[i][constants.codeIndex]] = 1;
            endTimes.push(convertToDs(rows[i][constants.endTimeIndex]));
            startTimes.push(convertToDs(rows[i][constants.endTimeIndex]));
            rows[i][constants.startTimeIndex] = convertToDs(rows[i][constants.startTimeIndex]);
            rows[i][constants.endTimeIndex] = convertToDs(rows[i][constants.endTimeIndex]);
        }
        maxTime = Math.max(...endTimes);
        minTime = Math.min(...startTimes);

        dsToPx = constants.imageWidth / (maxTime - minTime);
        var canvas = new fabric.StaticCanvas('canvas', { width: constants.imageWidth, height: constants.imageHeight, backgroundColor: colors.checkeredColor, selectable: false });
        var rect = new fabric.Rect({ top: (constants.imageHeight * constants.middle), left: 0, width: constants.imageWidth, height: 2, fill: colors.barColors, selectable: false });
        canvas.add(rect);
        for (r of rows) {
            r[constants.codeIndex] = r[constants.codeIndex].replace(/\\/g, '');
            //remove first 27 characters of r[constants.codeIndex]
            r[constants.codeIndex] = r[constants.codeIndex].substring(26);
            createShapes(canvas, r, dsToPx);
        }
        var timeLineRect = new fabric.Rect({ left: 0, top: constants.imageHeight * constants.timeLineFromTop, width: constants.imageWidth, height: constants.timeLineRectHeight, fill: colors.barColors, selectable: false });
        pxPerBar = constants.imageWidth / (maxTime / constants.secondsPerCheck);
        for (let i = 0; i < constants.imageWidth / pxPerBar; i++) {
            if (i % constants.checkInterval == 0 && i != 0) {
                let ticker = new fabric.Rect({ left: i * pxPerBar, top: constants.imageHeight * constants.timeLineFromTop - constants.timeLineBigTickerHeight, width: constants.timeLineRectHeight * 2.5, height: constants.timeLineBigTickerHeight, fill: colors.barColors, selectable: false });
                canvas.add(ticker);
                let timeText = new fabric.Text(convertToTime(i * constants.secondsPerCheck), { left: i * pxPerBar - 20, top: constants.imageHeight * constants.timeLineFromTop + constants.timeLineRectHeight, fontSize: 20, fill: colors.barColors, selectable: false });
                canvas.add(timeText);
            } else {
                let ticker = new fabric.Rect({ left: i * pxPerBar, top: constants.imageHeight * constants.timeLineFromTop - constants.timeLineTickerHeight, width: constants.timeLineRectHeight, height: constants.timeLineTickerHeight, fill: colors.barColors, selectable: false });
                canvas.add(ticker);
            }
        }
        canvas.add(timeLineRect);
    })
})

//Constants

//TODO: percision matters on pictures

const constants = {
    checkeredSquares: 10,
    typeIndex: 0,
    codeIndex: 1,
    startTimeIndex: 2,
    endTimeIndex: 3,
    rowsToShift: 1,
    imageWidth: 4000,
    imageHeight: 250,
    middle: 0.5,
    bigHeight: 0.5,
    mediumHeight: 0.4,
    midHeight: 0.15,
    smallHeight: 0.05,
    superSmallHeight: 0.075,
    minWidthPixels: 15,
    interactionWidth: 3,
    secondsPerCheck: 60,
    checkInterval: 5,
    timeLineRectHeight: 2,
    timeLineFromTop: 0.85,
    timeLineTickerHeight: 15,
    timeLineBigTickerHeight: 25,
}

const colors = {
    checkeredColor: '#FFF',
    barColors: '#000000',
    borderBlue: '#00BFFF',
    blue: '#0000FF',
    blue2: '#0085FF',
    borderGray: '#808080',
    transparent: 'transparent',
    purple: '#b3b3ff',
    lightGray: '#e6e6e6',
    darkGray: '#999999',
    lightGreen: '#b3ffb3',
    darkGreen: '#00cc00',
    darkBlue: '#0000cc',
    darkPurple: '#660066',
    darkNavy: '#000066',
    darkNavy2: '#000088',
    aqua: '#00ffff',
    darkTeal: '#006666',
    orange: '#ff9900',
    green: '#7EE419', // changed from #00cc00
    respondsToAnswers: '#CC9900',
    pink: '#ff0066',
    answerAssessment: '#ffff00',
    closingBlue: '#98CBFE',
    managmentBlue: '#3CCDCC',
    collaborationPurple: '#6601CB',
    directionsPurple: '#9965FF',
    reconsiderPurple: '#666699',
    studyBlue: '#B4C7E7',
    pinkContentAnswered: '#990699',
    pinkContentUnanswered: '#F832CC',
    pinkContent: '#F72B66',
    pinkNonContent: '#FBCC99',
    questionNonContentAnswered: '#F99934',
    questionNonContentUnAnswered: '#9A1900',
    colCall: '#991900',
    evalProgress: '#993366',
    rhetoricalQuestion: '#F76601',
    analogyGreen: '#146601',
    hintGreen: '#666634',
    providesTaskAnswer: '#99CC01',
    instructionGroupInteraction: '#FFCC00',
    instructionWholeClassInterruption: '#FFB800', //changed
    studentGroupInteraction: '#FF6600',
    studentWholeClassInterruption: '#FF3300',
    inteteractionAmiguous: '#A9E419', //changed
    other: '#000000',
}

const shapes = {
    borderRect: 'borderRect',
    bottomLine: 'bottomLine',
    rect: 'rect',
    text: 'text',
    diamond: 'diamond',
    hexagon: 'hexagon',
    square: 'square',
    circle: 'circle',
    triangle: 'triangle',
    ellipse: 'ellipse',
    path: 'path',
    polygon: 'polygon',
    yellow: 'yellow',
    picture: 'picture',
    interative: ['./images/Interative.svg', 40],
    nonInterative: ['./images/Non-interative.svg', 34],
    dialogicalInteractive: ['./images/Dialogical-interactive.svg', 40],
    dialogicalNonInteractive: ['./images/Dialogical-nonInteractive.svg', 40],
}




const codeToSpecs = {
    "Other": { shape: shapes.hexagon, color: colors.other, height: constants.smallHeight },
    "Off Task": { shape: shapes.diamond, color: colors.other, height: constants.smallHeight },
    "During Task Interaction TypeInstructor Initiated Group Interaction": { shape: shapes.bottomLine, height: constants.interactionWidth, color: colors.instructionGroupInteraction },
    "During Task Interaction TypeInstructor Initiated Whole Class Interruption": { shape: shapes.bottomLine, height: constants.interactionWidth, color: colors.instructionWholeClassInterruption },
    "During Task Interaction TypeStudent Initiated Group Interaction": { shape: shapes.bottomLine, height: constants.interactionWidth, color: colors.studentGroupInteraction },
    "During Task Interaction TypeStudent Initiated Whole Class Interruption": { shape: shapes.bottomLine, height: constants.interactionWidth, color: colors.studentWholeClassInterruption },
    "During Task Interaction TypeInteraction (Ambiguous)": { shape: shapes.bottomLine, height: constants.interactionWidth, color: colors.inteteractionAmiguous },
    "Communicative ApproachInteractive Authoritative": { shape: shapes.picture, shapeType: shapes.interative, height: constants.smallHeight, marginBottom: 4 },
    "Communicative ApproachNoninteractive Authoritative": { shape: shapes.picture, shapeType: shapes.nonInterative, height: constants.smallHeight, marginBottom: 0 },
    "Communicative ApproachInteractive Dialogical": { shape: shapes.picture, shapeType: shapes.dialogicalInteractive, height: constants.smallHeight, marginBottom: 5 },
    "Communicative ApproachNoninteractive Dialogical": { shape: shapes.picture, shapeType: shapes.dialogicalNonInteractive, height: constants.smallHeight, marginBottom: 5 },
    "Closing Task": { shape: shapes.borderRect, color: colors.transparent, height: constants.mediumHeight, borderColor: colors.orange },
    // "Direct Instruction": [],
    "Introduction of Task": { shape: shapes.borderRect, color: colors.transparent, height: constants.mediumHeight, borderColor: colors.borderBlue },
    "During Task": { shape: shapes.borderRect, color: colors.transparent, height: constants.mediumHeight, borderColor: colors.green },
    "ManagingAnnouncing Question Period": { shape: shapes.square, color: colors.darkBlue, height: constants.smallHeight },
    "ManagingCall on Student": { shape: shapes.square, color: colors.blue, height: constants.smallHeight },
    "ManagingCall on Students": { shape: shapes.square, color: colors.blue2, height: constants.smallHeight },
    "ManagingClosing Class": { shape: shapes.square, color: colors.closingBlue, height: constants.smallHeight },
    "ManagingClassroom Management": { shape: shapes.square, color: colors.managmentBlue, height: constants.smallHeight },
    "ManagingClosing Question Period": { shape: shapes.square, color: colors.aqua, height: constants.smallHeight },
    "ManagingCourse Reminders": { shape: shapes.square, color: colors.lightGreen, height: constants.smallHeight },
    "ManagingEncouragement": { shape: shapes.square, color: colors.darkTeal, height: constants.smallHeight },
    "ManagingEncouraging Collaboration": { shape: shapes.square, color: colors.collaborationPurple, height: constants.smallHeight },
    "ManagingOpening Class Period": { shape: shapes.square, color: colors.purple, height: constants.smallHeight },
    "ManagingOverview": { shape: shapes.square, color: colors.darkGreen, height: constants.smallHeight },
    "ManagingGiving Directions": { shape: shapes.square, color: colors.directionsPurple, height: constants.smallHeight },
    "ManagingReading Prompt": { shape: shapes.square, color: colors.darkPurple, height: constants.smallHeight },
    "ManagingReconsider Answer": { shape: shapes.square, color: colors.reconsiderPurple, height: constants.smallHeight },
    "ManagingTime Information": { shape: shapes.square, color: colors.darkNavy, height: constants.smallHeight },
    "ManagingStudy": { shape: shapes.square, color: colors.darkNavy2, height: constants.smallHeight },
    "Questioning Ask Content Question (Unanswered)": { shape: shapes.triangle, color: colors.pinkContentUnanswered, height: constants.superSmallHeight },
    "Questioning Asks Content Question (Answered)": { shape: shapes.triangle, color: colors.pinkContentAnswered, height: constants.superSmallHeight },
    "Questioning Asks for Questions": { shape: shapes.triangle, color: colors.pink, height: constants.superSmallHeight },
    "Questioning Asks for Whole Class Response (Content)": { shape: shapes.triangle, color: colors.pinkContent, height: constants.superSmallHeight },
    "Questioning Asks for Whole Class Response (Non-content)": { shape: shapes.triangle, color: colors.pinkNonContent, height: constants.superSmallHeight },
    "Questioning Asks Non-content Question (Answered)": { shape: shapes.triangle, color: colors.questionNonContentAnswered, height: constants.superSmallHeight },
    "Questioning Asks Non-content Question (Unanswered)": { shape: shapes.triangle, color: colors.questionNonContentUnAnswered, height: constants.superSmallHeight },
    "Questioning Asks for Questions": { shape: shapes.triangle, color: colors.pink, height: constants.superSmallHeight },
    "Questioning Cold Call Asks Question": { shape: shapes.triangle, color: colors.colCall, height: constants.superSmallHeight },
    "Questioning Evaluate Progress": { shape: shapes.triangle, color: colors.evalProgress, height: constants.superSmallHeight },
    "Questioning Rhetorical Asks for Questions": { shape: shapes.triangle, color: colors.rhetoricalQuestion, height: constants.superSmallHeight },
    "RelayingAnswer Student Question": { shape: shapes.circle, color: colors.green, height: constants.superSmallHeight },
    "RelayingAnswer Assessment": { shape: shapes.circle, color: colors.answerAssessment, height: constants.superSmallHeight },
    "RelayingExplains Answer": { shape: shapes.circle, color: colors.darkGreen, height: constants.superSmallHeight },
    "RelayingGives Analogy": { shape: shapes.circle, color: colors.analogyGreen, height: constants.superSmallHeight },
    "RelayingGiving Hint": { shape: shapes.circle, color: colors.hintGreen, height: constants.superSmallHeight },
    "RelayingProvides Task Answer": { shape: shapes.circle, color: colors.providesTaskAnswer, height: constants.superSmallHeight },
    "RelayingResponds to Student Answer": { shape: shapes.circle, color: colors.respondsToAnswers, height: constants.superSmallHeight },
}
