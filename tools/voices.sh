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

# ---- clicks (take-02): 8 bursts (the stop press at 18.86 s is left out), a higher dry layer on each
i=0
for s in 0.55-1.15 2.65-4.1 5.95-7.0 8.5-9.45 10.55-10.85 12.25-12.85 13.9-14.35 15.7-16.25; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-02-clicking.m4a -af "atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=250,$DN,$GATE" -ac 1 $W/c$i-a.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/c$i-a.wav -af "asetrate=48000*1.45,aresample=48000,highpass=f=1500,volume=0.6" $W/c$i-b.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/c$i-a.wav -i $W/c$i-b.wav -filter_complex "[0][1]amix=inputs=2:normalize=0:duration=first,equalizer=f=3500:t=q:w=1:g=3,afade=t=in:d=0.005" $W/c$i.wav
  peaknorm $W/c$i.wav -3 $W/cn$i.wav; check $W/cn$i.wav; enc $W/cn$i.wav mother-click-$i 24k
done

# ---- breath (take-01): 0.35..10.4 s. Clear first (it must read as breath): hard denoise, presence lift, a slight
#      lowering; then insect: a quiet buzzing copy under it and a dry chitinous tick at each inhale. Seamless loop.
ffmpeg -hide_banner -y -loglevel error -i $R/take-01.m4a -af "atrim=start=0.35:end=10.4,asetpts=PTS-STARTPTS,highpass=f=120,lowpass=f=9000" -ac 1 $W/b-cut.wav
peaknorm $W/b-cut.wav -10 $W/b-lvl.wav
ffmpeg -hide_banner -y -loglevel error -i $W/b-lvl.wav -af "$DN,afftdn=nr=20:nf=-60,asetrate=48000*0.94,aresample=48000,equalizer=f=2200:t=o:w=1.5:g=6,equalizer=f=300:t=q:w=1:g=-3" $W/b-dry.wav
ffmpeg -hide_banner -y -loglevel error -i $W/b-dry.wav -af "highpass=f=1800,tremolo=f=190:d=0.9,volume=0.22" $W/b-buzz.wav
python3 - $W/b-dry.wav $W/b-ticks.txt <<'PY'
import sys, subprocess, numpy as np
x = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',sys.argv[1],'-f','f32le','-ac','1','-ar','48000','-'],capture_output=True).stdout, dtype=np.float32)
w = 960; n = len(x)//w; e = np.sqrt((x[:n*w].reshape(n,w)**2).mean(1)); thr = np.percentile(e, 60); on = []
for i in range(1, n):
    if e[i] > thr and e[i-1] <= thr and (not on or i*0.02 - on[-1] > 0.6): on.append(round(i*0.02, 2))
open(sys.argv[2], 'w').write(' '.join(str(int(t*1000)) for t in on))
PY
T=$(cat $W/b-ticks.txt); n=0; inputs=""; mix=""
for ms in $T; do [ $n -ge 12 ] && break; n=$((n+1)); inputs="$inputs -i $O/mother-click-$(( (n % 8) + 1 )).ogg"; mix="$mix[$n]adelay=$ms,volume=0.18[t$n];"; done
lbl=$(for k in $(seq 1 $n); do printf "[t$k]"; done)
ffmpeg -hide_banner -y -loglevel error -i $W/b-dry.wav $inputs -i $W/b-buzz.wav -filter_complex "${mix}[0]${lbl}[$((n+1))]amix=inputs=$((n+2)):normalize=0:duration=first" $W/b0.wav
peaknorm $W/b0.wav -4 $W/b1.wav
F=0.5
ffmpeg -hide_banner -y -loglevel error -i $W/b1.wav -af "atrim=start=$F,asetpts=PTS-STARTPTS" $W/bm.wav
ffmpeg -hide_banner -y -loglevel error -i $W/b1.wav -af "atrim=end=$F,asetpts=PTS-STARTPTS" $W/bh.wav
ffmpeg -hide_banner -y -loglevel error -i $W/bm.wav -i $W/bh.wav -filter_complex "[0][1]acrossfade=d=$F:c1=qsin:c2=qsin" $W/breath.wav
check $W/breath.wav; enc $W/breath.wav mother-breath

# ---- whispers (take-03): the 8 lines, kept as real breathy whispers: close to her take, gentle hiss removal,
#      the airy top kept, a faint room; no doubling, no compression. All set to the loudness of
#      "we were cold too" (line 5) as she heard it on the listening page (v4), which Petra chose as the level.
lufs() { ffmpeg -hide_banner -i $1 -af ebur128 -f null - 2>&1 | sed -n 's/^ *I: *\(-*[0-9.]*\) LUFS/\1/p' | tail -1; }
i=0
for s in 0.1-2.5 5.2-7.4 10.15-11.6 13.4-16.95 19.35-21.05 22.85-24.65 26.4-27.95 29.3-31.35; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-03-whispers.m4a -af "atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=150,afftdn=nr=12:nf=-60:tn=1,equalizer=f=250:t=q:w=1:g=-2,highshelf=f=6000:g=3,apad=pad_dur=0.4,aecho=0.9:0.25:40|80:0.08|0.04,afade=t=in:d=0.01" -ac 1 $W/w$i.wav
done
T=-31   # LUFS: how loud "we were cold too" (line 5) was on the listening page, version 4, the level Petra picked
for i in 1 2 3 4 5 6 7 8; do
  g=$(python3 -c "print(round($T-($(lufs $W/w$i.wav)),2))")
  ffmpeg -hide_banner -y -loglevel error -i $W/w$i.wav -af "volume=${g}dB,alimiter=limit=0.89" $W/wn$i.wav
  check $W/wn$i.wav; enc $W/wn$i.wav whisper-$i 40k
done

# ---- shriek (take-04): Petra keeps the 2nd and 3rd; the 3rd is the main one (louder), the 2nd a quieter variant
i=0
for s in 6.45-9.6 11.15-12.25; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-04-shriek.m4a -af "atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=180,$DN" -ac 1 $W/s$i-raw.wav
  if [ $i = 1 ]; then
    # her 2nd take ends in a breathy hiss (from 2.0 s): de-essed and softened, brought right up behind the screech (the quiet gap is cut) and smoothed into it
    # Petra: its own screech sounded like a creak, so it opens with her 3rd take's screech instead
    ffmpeg -hide_banner -y -loglevel error -i $R/take-04-shriek.m4a -af "atrim=start=11.15:end=12.0,asetpts=PTS-STARTPTS,highpass=f=180,$DN" -ac 1 $W/s$i-p1.wav
    ffmpeg -hide_banner -y -loglevel error -i $W/s$i-raw.wav -af "atrim=start=1.85,asetpts=PTS-STARTPTS,deesser=i=0.8:m=0.6:f=0.5,lowpass=f=6000,afftdn=nr=24:nf=-55,volume=9dB" $W/s$i-p2.wav
    # smoothed: the screech darkens as it goes (a bright copy fading into a low-passed one), then a long
    # equal-power crossfade lets it sink under the hiss with no dip
    ffmpeg -hide_banner -y -loglevel error -i $W/s$i-p1.wav -filter_complex "[0]asplit[b][d];[b]afade=t=out:st=0.3:d=0.55[bb];[d]lowpass=f=2200,lowpass=f=2200,afade=t=in:st=0.3:d=0.55[dd];[bb][dd]amix=inputs=2:normalize=0" $W/s$i-p1g.wav
    ffmpeg -hide_banner -y -loglevel error -i $W/s$i-p1g.wav -i $W/s$i-p2.wav -filter_complex "[0][1]acrossfade=d=0.55:c1=qsin:c2=qsin" $W/s$i-raw2.wav
    mv $W/s$i-raw2.wav $W/s$i-raw.wav
  fi
  ffmpeg -hide_banner -y -loglevel error -i $W/s$i-raw.wav -af "alimiter=limit=0.9,asetrate=48000*1.35,aresample=48000" -ac 1 $W/s$i-a.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/s$i-a.wav -af "asetrate=48000*1.9,aresample=48000,highpass=f=2500,volume=0.35" $W/s$i-b.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/s$i-a.wav -i $W/s$i-b.wav -filter_complex "[0]tremolo=f=58:d=0.3,highpass=f=400[x];[x][1]amix=inputs=2:normalize=0:duration=first,equalizer=f=4000:t=q:w=1:g=3,afade=t=in:d=0.02" $W/s$i.wav
  ffmpeg -hide_banner -y -loglevel error -i $W/s$i.wav -af "areverse,afade=t=in:d=0.2,areverse" $W/s$i-f.wav
  peaknorm $W/s$i-f.wav -1 $W/sn$i.wav; check $W/sn$i.wav
done
enc $W/sn2.wav mother-shriek-1 40k   # main (her 3rd take)
enc $W/sn1.wav mother-shriek-2 40k   # variant (her 2nd take)
