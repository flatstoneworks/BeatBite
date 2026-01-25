# Beatbox Detection Research

Research compiled for improving the BeatboxDetector in Beatbite.

## Beatbox Sound Characteristics

| Sound | Phonetics | How to Make | Frequency Range | Character |
|-------|-----------|-------------|-----------------|-----------|
| **Kick** | "B" or "Boom" | Lips closed, small burst of air, sharp pop | 30-60 Hz (fundamental), punch at 2-8 kHz | Plosive, short burst |
| **Snare** | "Pf" or "Pft" | Lips close together, expel air with friction | 150-200 Hz (attack) + high freq noise | Plosive + fricative combo |
| **Hi-hat closed** | "Ts" or "T" | Tongue against back of teeth, short burst | ~500 Hz AND ~10 kHz (two peaks!) | Short alveolar fricative |
| **Hi-hat open** | "Tss" | Same as closed but extend the "s" sound | Same frequencies but sustained | Extended fricative |

## Frequency Analysis from Research

### Kick Drum (Bass Drum)
- Highest peaks: 30-50 Hz, central frequency around 40 Hz
- Effective range: 20-200 Hz (occupies entire bass spectrum)
- Spikes around 64 Hz
- Fundamentals: 50-60 Hz with "punch" peaks at 2-8 kHz
- **Easiest to classify** due to unique low frequency presence

### Snare Drum
- Fundamentals: 150-200 Hz (stick hitting skin)
- Higher "rattle/snare" content in upper frequencies
- Typical duration: 200-300 ms
- Inward Ph snare: impulsive sound followed by frication noise

### Hi-Hat
- **Two central frequencies**: ~500 Hz AND ~10,000 Hz
- Closed: short, sharp attack
- Open: extended sustain
- **Hardest to classify** due to high-frequency characteristics and dual peaks

## Current Detector Configuration

```typescript
// Frequency bands (Hz)
const BANDS = {
  low: { min: 50, max: 150 },      // Kick drum range
  mid: { min: 150, max: 2000 },    // Snare body range
  high: { min: 2000, max: 8000 },  // Hi-hat range
};
```

### Known Issues

1. **Kick range too narrow** - Fundamentals at 30-60 Hz, current min is 50 Hz
2. **Hi-hat has TWO peaks** - One at ~500 Hz (falls in "mid" band!) and one at ~10 kHz (above "high" band max of 8 kHz)
3. **Snare dual nature** - Has both plosive attack AND fricative noise, not captured by simple energy ratio

## Recommended Improvements

### 1. Adjust Frequency Bands
```typescript
const BANDS = {
  low: { min: 30, max: 200 },       // Extended kick range
  mid: { min: 200, max: 2500 },     // Snare body
  high: { min: 2500, max: 12000 },  // Hi-hat (extended upper range)
};
```

### 2. Add Secondary Hi-Hat Detection
Hi-hat has energy at both ~500 Hz and ~10 kHz. Consider:
- Detecting the combination of mid-low AND very high frequency
- Or using spectral flatness (hi-hat is more noise-like)

### 3. Consider Temporal Features
- Kick: Very short attack, quick decay
- Snare: Medium attack, noise tail
- Hi-hat closed: Short overall
- Hi-hat open: Longer sustain

### 4. Machine Learning Features to Consider
Research shows these features are effective:
- RMS (Root Mean Square) - overall loudness
- Zero-crossing rate - indicates frequency content
- Spectral centroid - "brightness" of sound
- Spectral bandwidth - how spread out frequencies are
- Spectral flatness - how noise-like (useful for hi-hat)
- MFCCs (Mel-Frequency Cepstral Coefficients) - used in deep learning approaches

## Basic Beat Patterns

For testing detection:
- Simple: `B---Pf---B---Pf` (kick-snare alternating)
- With hi-hat: `B-Ts-Ts-Ts-Pf-Ts-Ts-Ts`
- Classic: "Boots ts ts ts cats ts ts ts"

## Sources

- [Spectral Energy Distribution in Human Beatbox Sounds (FRSM-2024)](https://link.springer.com/chapter/10.1007/978-3-032-03729-9_15)
- [Exploring Spectral and Temporal Characteristics of Human Beatbox Sounds](https://www.sciencedirect.com/science/article/abs/pii/S0892199721003556)
- [Analysis and Automatic Recognition of Human Beatbox Sounds](https://www.researchgate.net/publication/274314587_Analysis_and_Automatic_Recognition_of_Human_Beatbox_Sounds_a_Comparative_Study)
- [A Deep Learning-Based Beatbox Sound Recognition Method](https://medium.com/@subjana/a-deep-learning-based-beatbox-sound-recognition-method-1635f6ae396d)
- [Drum Frequencies Guide](https://www.audiorecording.me/drum-frequencies-of-kick-bass-drum-hi-hats-snare-and-crash-cymbals.html/2)
- [School of Beatbox - How to Beatbox](https://www.schoolofbeatbox.com/how-to-beatbox-from-scratch-master-basic-sounds-snare-drum/)
- [Human Beatbox - Basic Hi Hat](https://www.humanbeatbox.com/techniques/sounds/basic-hi-hat/)

## TODO

- [ ] Get voice samples from user for personalized tuning
- [ ] Test with adjusted frequency bands
- [ ] Consider adding spectral flatness for hi-hat detection
- [ ] Experiment with MFCCs for better classification
