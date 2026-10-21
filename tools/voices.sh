set -e
R=$1; O=$2; W=work
enc() { ffmpeg -hide_banner -y -loglevel error -i $1 -c:a libopus -b:a ${3:-32k} $O/$2.ogg; ffmpeg -hide_banner -y -loglevel error -i $1 -c:a aac -b:a 48k $O/$2.m4a; }
peaknorm() { m=$(ffmpeg -hide_banner -i $1 -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-*[0-9.]*\) dB/\1/p'); g=$(python3 -c "print(round($2-($m),2))"); ffmpeg -hide_banner -y -loglevel error -i $1 -af "volume=${g}dB" $3; }
CLEAN="highpass=f=90,afftdn=nf=-50:nr=12"
ffmpeg -hide_banner -y -loglevel error -i $R/take-01.m4a -af "atrim=start=0.35:end=10.4,asetpts=PTS-STARTPTS,$CLEAN,lowpass=f=7500,asetrate=48000*0.9,aresample=48000,equalizer=f=2600:t=q:w=1.2:g=4,tremolo=f=36:d=0.28" -ac 1 $W/b0.wav
peaknorm $W/b0.wav -4 $W/b1.wav
F=0.5
ffmpeg -hide_banner -y -loglevel error -i $W/b1.wav -af "atrim=start=$F,asetpts=PTS-STARTPTS" $W/bm.wav
ffmpeg -hide_banner -y -loglevel error -i $W/b1.wav -af "atrim=end=$F,asetpts=PTS-STARTPTS" $W/bh.wav
ffmpeg -hide_banner -y -loglevel error -i $W/bm.wav -i $W/bh.wav -filter_complex "[0][1]acrossfade=d=$F:c1=qsin:c2=qsin" $W/breath.wav
enc $W/breath.wav mother-breath
i=0
for s in 0.55-1.15 2.65-4.1 5.95-7.0 8.5-9.45 10.55-10.85 12.25-12.85 13.9-14.35 15.7-16.25; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-02-clicking.m4a -filter_complex "[0]atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=200,afftdn=nf=-50:nr=12,asplit[x][y];[y]asetrate=48000*1.45,aresample=48000,highpass=f=1500,volume=0.6[h];[x][h]amix=inputs=2:normalize=0,equalizer=f=3500:t=q:w=1:g=3,afade=t=in:d=0.005,areverse,afade=t=in:d=0.03,areverse" -ac 1 $W/c$i.wav
  peaknorm $W/c$i.wav -3 $W/cn$i.wav; enc $W/cn$i.wav mother-click-$i 24k
done
i=0
for s in 0.1-2.5 5.2-7.4 10.15-11.6 13.4-16.95 19.35-21.05 22.85-24.65 26.4-27.95 29.3-31.35; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-03-whispers.m4a -filter_complex "[0]atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=140,afftdn=nf=-50:nr=14,equalizer=f=3200:t=q:w=1:g=5,equalizer=f=250:t=q:w=1:g=-3,apad=pad_dur=0.9,asplit=3[d][t][r];[t]asetrate=48000*1.025,aresample=48000,adelay=22,volume=0.45[tt];[r]areverse,aecho=0.8:0.6:90|170:0.35|0.22,areverse,volume=0.35[rr];[d][tt][rr]amix=inputs=3:normalize=0,aecho=0.8:0.5:60|140:0.25|0.15,afade=t=in:d=0.01" -ac 1 $W/w$i.wav
  peaknorm $W/w$i.wav -3 $W/wn$i.wav; enc $W/wn$i.wav whisper-$i 32k
done
i=0
for s in 0.25-4.3 6.45-9.6 11.15-12.25; do
  a=${s%-*}; b=${s#*-}; i=$((i+1))
  ffmpeg -hide_banner -y -loglevel error -i $R/take-04-shriek.m4a -filter_complex "[0]atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,highpass=f=150,afftdn=nf=-45:nr=18,alimiter=limit=0.9,asetrate=48000*1.35,aresample=48000,asplit[x][y];[y]asetrate=48000*1.9,aresample=48000,highpass=f=2500,volume=0.5[h];[x]tremolo=f=58:d=0.45,highpass=f=400[xt];[xt][h]amix=inputs=2:normalize=0,equalizer=f=4000:t=q:w=1:g=3,afade=t=in:d=0.01,areverse,afade=t=in:d=0.15,areverse" -ac 1 $W/s$i.wav
  peaknorm $W/s$i.wav -1 $W/sn$i.wav; enc $W/sn$i.wav mother-shriek-$i 40k
done
