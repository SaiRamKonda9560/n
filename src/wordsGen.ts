// WordDataEntry class
class WordDataEntry {
    PartOfSpeech!: string;
    WordMeaning!: string;
}
// WordData class
class WordData {
    EnglishWord!: string;
    Entries!: WordDataEntry[];
    audiofile!: string;
    PronunciationAudioClip!: string;
}
// wordsGen class
class wordsGen {
    static instance: wordsGen;
    static jsondata : string;
    public wordList: WordData[];
    // Most common letters in English from most to least frequent
    static readonly MostCommonLetters: string[] = [
        'E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D'
    ];
    // All uppercase English letters
    static readonly AllLetters: string[] = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
    ];
    constructor(json?:string) {
        wordsGen.instance = this;
        try {
            const data = JSON.parse(json || "[]");
            this.wordList = data as WordData[];
            } catch (err) {
            this.wordList = []; // fallback empty array
            }
    }
    private GetWordsSortedByLength(words: WordData[]): WordData[] {
        return words.sort((a, b) => a.EnglishWord.length - b.EnglishWord.length);
    }
    public GetWordsByLength(length: number): WordData[] {
        if (!this.wordList) return [];
        return this.wordList.filter(w => w.EnglishWord.length === length);
    }
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
        selectedWords.length = 0;
        missingLettersWords.length = 0;
        commanRandomLettersList.length = 0;
        nonCommonRandomLettersList.length = 0;

        if (commonMissingCount <= 0 || commonMissingCount > wordsGen.MostCommonLetters.length) {
            console.warn("Invalid letter count.");
            return;
        }

        let availableLetters = [...wordsGen.MostCommonLetters];
        for (let i = 0; i < commonMissingCount; i++) {
            const rand = Math.floor(Math.random() * availableLetters.length);
            commanRandomLettersList.push(availableLetters[rand]);
            availableLetters.splice(rand, 1);
        }

        const words = this.GetWordsByLength(lengthOfWords);
        if (words.length === 0) {
            console.warn("No words available for this length.");
            return;
        }

        let availableIndices = Array.from({ length: words.length }, (_, i) => i);
        while (selectedWords.length < max && availableIndices.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableIndices.length);
            const wordIndex = availableIndices[randomIndex];
            availableIndices.splice(randomIndex, 1);

            const word = words[wordIndex].EnglishWord;
            const containsAll = commanRandomLettersList.every(letter =>
                word.toLowerCase().includes(letter.toLowerCase())
            );

            if (containsAll) {
                selectedWords.push(words[wordIndex]);
                let missing = this.ReplaceWithMissingAndStars(word, commanRandomLettersList, randomMissingCount);
                missingLettersWords.push(missing);
                const nonCommon: string[] = [];
                for (let i = 0; i < missing.length; i++) {
                    if (missing[i] === '*') {
                        nonCommon.push(word[i]);
                    }
                }
                nonCommonRandomLettersList.push(nonCommon);
            }
        }
    }
    private ReplaceWithMissingAndStars(word: string, targets: string[], starCount: number): string {
        const chars = word.split('');

        for (const target of targets) {
            const indices: number[] = [];
            for (let i = 0; i < word.length; i++) {
                if (word[i].toLowerCase() === target.toLowerCase() && chars[i] !== '_') {
                    indices.push(i);
                }
            }
            if (indices.length > 0) {
                const randomIndex = indices[Math.floor(Math.random() * indices.length)];
                chars[randomIndex] = '_';
            }
        }

        const otherIndices: number[] = [];
        for (let i = 0; i < word.length; i++) {
            if (!targets.some(t => word[i].toLowerCase() === t.toLowerCase()) && chars[i] !== '_') {
                otherIndices.push(i);
            }
        }

        for (let i = 0; i < starCount && otherIndices.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * otherIndices.length);
            const pos = otherIndices[randomIndex];
            chars[pos] = '*';
            otherIndices.splice(randomIndex, 1);
        }

        return chars.join('');
    }
}