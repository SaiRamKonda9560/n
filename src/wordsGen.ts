// =======================
// WordDataEntry class
// =======================
class WordDataEntry {
    PartOfSpeech!: string;
    WordMeaning!: string;
}

// =======================
// WordData class
// =======================
class WordData {
    EnglishWord!: string;
    Entries!: WordDataEntry[];
    audiofile!: string;
    PronunciationAudioClip!: string;
}

// =======================
// wordsGen class
// =======================
class wordsGen {

    static instance: wordsGen | null = null;
    static jsondata: string = "";

    public wordList: WordData[] = [];

    // Most common letters
    static readonly MostCommonLetters: string[] = [
        'E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D'
    ];

    static readonly AllLetters: string[] = [
        'A','B','C','D','E','F','G','H','I','J','K','L','M',
        'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
    ];

    constructor(input?: string | WordData[]) {

        if (!wordsGen.instance) {
            wordsGen.instance = this;
        }

        if (!input) {
            this.wordList = [];
            return;
        }

        if (typeof input === "string") {
            try {
                const data = JSON.parse(input);
                if (Array.isArray(data)) {
                    this.wordList = data.filter(w => w?.EnglishWord);
                } else {
                    this.wordList = [];
                }
            } catch {
                this.wordList = [];
            }
            return;
        }

        if (Array.isArray(input)) {
            this.wordList = input.filter(w => w?.EnglishWord);
            return;
        }

        this.wordList = [];
    }

    // =======================
    // SAFE SORT (no mutation)
    // =======================
    private GetWordsSortedByLength(words: WordData[]): WordData[] {
        return [...words].sort(
            (a, b) => a.EnglishWord.length - b.EnglishWord.length
        );
    }

    public GetWordsByLength(length: number): WordData[] {
        if (!this.wordList || length <= 0) return [];
        return this.wordList.filter(
            w => w?.EnglishWord && w.EnglishWord.length === length
        );
    }

    // =======================
    // MAIN GENERATOR
    // =======================
    generateWords(
        lengthOfWords: number,
        max: number,
        randomMissingCount: number,
        commonMissingCount: number,
        selectedWords: WordData[],
        missingLettersWords: string[],
        commanRandomLettersList: string[],
        nonCommonRandomLettersList: string[][]
    ): void {

        // reset outputs
        selectedWords.length = 0;
        missingLettersWords.length = 0;
        commanRandomLettersList.length = 0;
        nonCommonRandomLettersList.length = 0;

        if (lengthOfWords <= 0 || max <= 0) return;

        if (
            commonMissingCount <= 0 ||
            commonMissingCount > wordsGen.MostCommonLetters.length
        ) {
            return;
        }

        // pick common letters
        const availableLetters = [...wordsGen.MostCommonLetters];
        for (let i = 0; i < commonMissingCount; i++) {
            const idx = Math.floor(Math.random() * availableLetters.length);
            commanRandomLettersList.push(availableLetters[idx]);
            availableLetters.splice(idx, 1);
        }

        const words = this.GetWordsByLength(lengthOfWords);
        if (words.length === 0) return;

        const shuffled = [...words].sort(() => Math.random() - 0.5);

        for (const wd of shuffled) {

            if (selectedWords.length >= max) break;

            const word = wd.EnglishWord;
            if (!word) continue;

            const containsAll = commanRandomLettersList.every(l =>
                word.toLowerCase().includes(l.toLowerCase())
            );

            if (!containsAll) continue;

            selectedWords.push(wd);

            const masked = this.ReplaceWithMissingAndStars(
                word,
                commanRandomLettersList,
                randomMissingCount
            );

            missingLettersWords.push(masked);

            const nonCommon: string[] = [];
            for (let i = 0; i < masked.length; i++) {
                if (masked[i] === '*') {
                    nonCommon.push(word[i]);
                }
            }
            nonCommonRandomLettersList.push(nonCommon);
        }
    }

    // =======================
    // SAFE MASKING
    // =======================
    public ReplaceWithMissingAndStars(
        word: string,
        targets: string[],
        starCount: number
    ): string {

        if (!word) return "";

        const chars = word.split('');

        // replace common letters with '_'
        for (const target of targets) {
            const indices: number[] = [];
            for (let i = 0; i < chars.length; i++) {
                if (
                    chars[i] !== '_' &&
                    chars[i].toLowerCase() === target.toLowerCase()
                ) {
                    indices.push(i);
                }
            }

            if (indices.length > 0) {
                const r = indices[Math.floor(Math.random() * indices.length)];
                chars[r] = '_';
            }
        }

        // find remaining positions
        const otherIndices: number[] = [];
        for (let i = 0; i < chars.length; i++) {
            if (
                chars[i] !== '_' &&
                !targets.some(t => t.toLowerCase() === chars[i].toLowerCase())
            ) {
                otherIndices.push(i);
            }
        }

        // clamp starCount
        const stars = Math.min(starCount, otherIndices.length);

        for (let i = 0; i < stars; i++) {
            const r = Math.floor(Math.random() * otherIndices.length);
            const pos = otherIndices[r];
            chars[pos] = '*';
            otherIndices.splice(r, 1);
        }

        return chars.join('');
    }
}
