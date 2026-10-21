# Petra's takes -> game files. Run: bash voices.sh <raw dir> <out dir>   (ffmpeg only)
set -e
R=$1; O=$2; W=work; mkdir -p $W
enc() { ffmpeg -hide_banner -y -loglevel error -i $1 -c:a libopus -b:a ${3:-32k} $O/$2.ogg; ffmpeg -hide_banner -y -loglevel error -i $1 -c:a aac -b:a 48k $O/$2.m4a; }
peak() { ffmpeg -hide_banner -i $1 -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-*[0-9.]*\) dB/\1/p'; }
peaknorm() { g=$(python3 -c "print(round($2-($(peak $1)),2))"); ffmpeg -hide_banner -y -loglevel error -i $1 -af "volume=${g}dB" $3; }
# loudness for speech-like clips: loudnorm to a target, then a peak limit
loud() { ffmpeg -hide_banner -y -loglevel error -i $1 -af "loudnorm=I=$2:TP=-1.5:LRA=7,aresample=48000" $3; }
check() { p=$(peak $1); python3 -c "import sys; sys.exit(0 if $p > -30 else 1)" || { echo "SILENT OR TOO QUIET: $1 ($p dB)"; exit 1; }; }
# strong noise removal: highpass, non-local-means + spectral denoise tracking the noise, gate the gaps
DN="afftdn=nr=30:nf=-60:tn=1,anlmdn=s=6:p=0.004:r=0.006,afftdn=nr=18:nf=-65"
GATE="agate=threshold=0.012:ratio=6:attack=4:release=150:range=0.03"

# ---- breath (take-01): 0.35..10.4 s; lower, fluttering; seamless loop
ffmpeg -hide_banner -y -loglevel error -i $R/take-01.m4a -af "atrim=start=0.35:end=10.4,asetpts=PTS-STARTPTS,highpass=f=110,lowpass=f=7000,$DN,asetrate=48000*0.9,aresample=48000,equalizer=f=2600:t=q:w=1.2:g=4,tremolo=f=36:d=0.28" -ac 1 $W/b0.wav
peaknorm $W/b0.wav -4 $W/b1.wav
F=0.5
ffmpeg -hide_banner -y -loglevel error -i $W/b1.wav -af "atrim=start=$F,asetpts=PTS-STARTPTS" $W/bm.wav
ffmpeg -hide_banner -y -loglevel error -i $W/b1.wav -af "atrim=end=$F,asetpts=PTS-STARTPTS" $W/bh.wav
ffmpeg -hide_banner -y -loglevel error -i $W/bm.wav -i $W/bh.wav -filter_complex "[0][1]acrossfade=d=$F:c1=qsin:c2=qsin" $W/breath.wav
check $W/breath.wav; enc $W/breath.wav mother-breath

# ---- clicks (take-02): 8 bursts (the stop press at 18.86 s is left out), a higher dry layer on each
i=0
for s in 0.55-1.15 2.65-4.1 5.95-7.0 8.5-9.45 10.55-10.85 12.25-12.85 13.9-14.35 15.7-16.25; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-02-clicking.m4a -af "atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=250,$DN,$GATE" -ac 1 $W/c$i-a.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/c$i-a.wav -af "asetrate=48000*1.45,aresample=48000,highpass=f=1500,volume=0.6" $W/c$i-b.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/c$i-a.wav -i $W/c$i-b.wav -filter_complex "[0][1]amix=inputs=2:normalize=0:duration=first,equalizer=f=3500:t=q:w=1:g=3,afade=t=in:d=0.005" $W/c$i.wav
  peaknorm $W/c$i.wav -3 $W/cn$i.wav; check $W/cn$i.wav; enc $W/cn$i.wav mother-click-$i 24k
done

# ---- whispers (take-03): the 8 lines, cleaned hard, loud and clear; a detuned double, a reversed swell, short echoes
i=0
for s in 0.1-2.5 5.2-7.4 10.15-11.6 13.4-16.95 19.35-21.05 22.85-24.65 26.4-27.95 29.3-31.35; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-03-whispers.m4a -af "atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=160,lowpass=f=9000,$DN,$GATE,equalizer=f=3200:t=q:w=1:g=6,equalizer=f=250:t=q:w=1:g=-4,apad=pad_dur=0.8" -ac 1 $W/w$i-dry.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/w$i-dry.wav -af "asetrate=48000*1.025,aresample=48000,adelay=22,volume=0.4" $W/w$i-dbl.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/w$i-dry.wav -af "areverse,aecho=0.8:0.6:90|170:0.35|0.22,areverse,volume=0.3" $W/w$i-rev.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/w$i-dry.wav -i $W/w$i-dbl.wav -i $W/w$i-rev.wav -filter_complex "[0][1][2]amix=inputs=3:normalize=0:duration=first,aecho=0.8:0.5:60|140:0.22|0.12" $W/w$i.wav
  loud $W/w$i.wav -16 $W/wn$i.wav; check $W/wn$i.wav; enc $W/wn$i.wav whisper-$i 32k
done

# ---- shriek (take-04): Petra keeps the 2nd and 3rd; the 3rd is the main one (louder), the 2nd a quieter variant
i=0
for s in 6.45-9.6 11.15-12.25; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-04-shriek.m4a -af "atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=180,$DN,alimiter=limit=0.9,asetrate=48000*1.35,aresample=48000" -ac 1 $W/s$i-a.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/s$i-a.wav -af "asetrate=48000*1.9,aresample=48000,highpass=f=2500,volume=0.5" $W/s$i-b.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/s$i-a.wav -i $W/s$i-b.wav -filter_complex "[0]tremolo=f=58:d=0.45,highpass=f=400[x];[x][1]amix=inputs=2:normalize=0:duration=first,equalizer=f=4000:t=q:w=1:g=3,afade=t=in:d=0.01" $W/s$i.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/s$i.wav -af "areverse,afade=t=in:d=0.15,areverse" $W/s$i-f.wav
  peaknorm $W/s$i-f.wav -1 $W/sn$i.wav; check $W/sn$i.wav
done
enc $W/sn2.wav mother-shriek-1 40k   # main (her 3rd take)
enc $W/sn1.wav mother-shriek-2 40k   # variant (her 2nd take)
