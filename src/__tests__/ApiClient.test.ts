import { ApiClient } from '../ApiClient';
import { Params } from '../Api';
import { gzipSync } from 'fflate';
import fs from 'fs';
import { Base85 } from '../Base85';
import { Vcf } from '../index';

let api: ApiClient;

const sortAllExpected = {
  page: { number: 0, size: 10, totalElements: 2 },
  total: 2
};

let record0: Vcf.Record = expect.objectContaining({ p: 10042538 }) as Vcf.Record;
let record1: Vcf.Record = expect.objectContaining({ p: 16376412 }) as Vcf.Record;

beforeEach(() => {
  const reportData = {
    metadata: {
      app: {
        name: 'vcf-report',
        version: '0.0.1',
        args: '-i test.vcf -d'
      },
      htsFile: {
        htsFormat: 'VCF',
        uri: 'file://file0.vcf.gz',
        genomeAssembly: 'GRCh38'
      }
    },
    data: {
      samples: {
        items: [
          {
            name: 'Patient'
          },
          {
            name: 'Mother'
          },
          {
            name: 'Father'
          }
        ],
        total: 3
      },
      phenotypes: {
        items: [],
        total: 0
      }
    },
    base85: {
      vcfGz: new Base85().encode(Buffer.from(gzipSync(fs.readFileSync(__dirname + '/trio.vcf')))),
      fastaGz: {
        '1:17350500-17350600': new Base85().encode(
          Buffer.from(gzipSync(fs.readFileSync(__dirname + '/interval0.fasta')))
        ),
        '2:47637200-47637300': new Base85().encode(
          Buffer.from(gzipSync(fs.readFileSync(__dirname + '/interval1.fasta')))
        )
      },
      genesGz: new Base85().encode(Buffer.from(gzipSync(fs.readFileSync(__dirname + '/example.gff')))),
      bam: 'ABzY800000003;d1yq$y)HY1>&`OB3k_sNW8&MDsEqzGoLzi@kbc1w@bV_$fiF6~~DIneO&GC8O_g(8>ziYYA%${rSeeFFn_dRnfP3S*pNQgi87)UQAQIMh-;ymX|of@rlW*f((w_iVv9w#7hi+*h7up@|%lIQE-q(6;J{-he2j(ym9UsA>5fM<%Zhq$-7wb5Z?S}U2pE92?gV^Z(i+WWiv+l2c+2X{Mp_g5WacUL`E8P^1@myI;u_jzKsmjw4mJ&U)qV)s3*R|AXpe^T`BFRt%zH?KO%yl&}w$0z;G+{H5p@|pQY_mIV?RnoqeRNwk~h(1#>7WqY86^U8Nn{IUX#asBXaeS_!H@he`x3MOHi#xj*^_wDLq4PaoFX5$L=In@D^uA3ZYQf(WlUJ8t<9;=Iz8q@J8maqDRFq+(=ikUaaNE1No1pYbnnyu&u~lV4E01hX5=qNt0QMnxf&f`Im-p4q-I63y<sXe!>$??6B&#z)w|R6)nuA5-+aga=T+gPK6D5^RR>LcoYlb+%oCCI_S%s1lTH{}RXG<BPclr<T3a;<(XCuY7N>UQ;F1_yv$f5GLY^R%I_xq9F7i0IA+<t0d6HT@qONrQHSiF0-+*iUY<4bNC&6N7pj}t#LOc51pJysHlkor>!4e<ERakCQ@`=(Gsqnc5HwD_0ao>NIU5kB|Gq!tIu-Dc~h>T}~}iY4;hyT+qn7AQ&8a{d;3Xue1fYTR?DO2L!l1*ELc@=S?T;R)}eiDZ>X#(rFUkLE#|91SyJ)5%nPYfyQ&17*fmE>L48jrvg-4ln7(WL-MWYcEvMj~IG5g^HxM?M4|b5in7_$tN$)Ke^m$r|;`$0+G(-X<vW&OSW8xzZ^Y@<pWuy8*)2U|7jlM*|?pi0he2W!|Q6e@6gkd_2Cz>r)WkNg4N0vCi6Ntk#-Vs29{@d^csKUE`kiBY9l11pJ=?YnRHxe!@##r>U@YPYNVEP?1MVl7vg#R586Sd@XSNgiHf^fv~F*=?`V_970aGp_q&l9{H)M%njM|?-xu2HLkay6Lzl;wT8@q$3+Y3~lo?~E*EqwGK1WzCoyTLxS01_vfdZljQ)p`!AFG?uY^m=B+T(aAX{L5Jf1yS5>3g8KIEt8ym(plhD?|=uw2JFo9bV=<P1<ao+Pv@|9NL7UGU4^*AiXc_*<{0sKE4(~7w5%vxff|BcD%dI^WPS}zcJQ#_<4AFdNmj6%{G*=S?x0vw4lc<+9KX+!X5!N%Sk=Z;}_Z7Tx9vxd4iXi;6Ho>>&bAT?cDf0b^HNBSb?>>>pBAMaiYGzGp4JgxxY)!s&TuyhJMlpZu@Xfvme$bJS=-G*YjN4Wc*4AXHQFN_n_zS@*U2tB~yuT^>p3g;Q<?D?DDb?e{)2EyWy1w@5k=-^`J=R_suusmqQsH7S$vRI8Tm_vK>9V3hL4}#mdB=n34?j;hBlu->&z}YI+?Pv<6mZq(^REm-)19BA;N>+t)m3rj^U+dCi$Y==OQFXHx-3ySK~k=JK<C*<QYc=UdyZxoq^EcPP86k<mL9Q6vRJS!X2w3>F~u^}VB(q&g-E8jRjQGPJlkUetR;@94qG;5B$l@?-EoOxOA-5$mMyrRnnOF-z1yHqpA*>yYY4U;>U)JWh^<O<rUiP7WQOv!Rwc%D+A#$=~F^yJg5w{R2ugswaX0pS%mH>N#)x?H+uePviO1Ij*NitTlk<_{L2=m!U^|hz*l_#_q<#6@uwPd9Sr#ahd9U{}!!hq=EHb<<yeuIONF9>xNQi>v5L)nalIQ$nR7Mhi4zW<jZP>C^q{%Y3MGPrC3+VO;?*M#$5*$OaE}FL@xWYo-cfhaG5+Q<Bnu(XdU`~7DtO)QYW4++tDY%N-8e>si}LbhhK0_*@5EwCI_orwQ|H*enS3KQ3bX4+EG<?YPem~7pIKP@9-b*^jTV`+|YzKe>GCZHatye9j@P5p<8*&e4$N&Tklx$-CL*y?k;dE5E(Bp16{FbS}m$!ai?6}5|DQPSs6<m+BQ-;+=9DzLA&={Zr?BB!^oBKqTEo~;pYtv84r=<E|!}JrJ=X2lYf4r;%y2@-Q$Rux9mS&^eFLFwWIklDgF8S()s?%CL?;kJ^TL8l-TV>hWw8^Ddk=6!q68sMvw-39nxRCYuarer0)jG;>+%z$t=7fR3j~*IEogQC8(!FYhGwB%Tb?m{psGXmVe3CX_GlAZFv}Fm9kL?cR%dXtR>Z=JCb`%s>%JKy$nq%By?^=;Ad(Fy0wjbRktN|#euyy@ziaE$4^i1r^|7@b*=K(I3k?Jr1dbuq3UuSBc8KwM^Dbfb0r>4j8T-l6rY-L(Tq9!IpKMF>#w#Ub%$fsS5nG9-Y7KiZMG*wg)e0_!~1fK*%4}SU_RMiJt1`D(BEr<HPz_b6lKi!pkV#a?vV51qFKD?oF2_JMR;66QRtk?E6##wA%*M@tmmpH<PKa$S~-rVJ#*Fd@f7vPsTHk_Z|ZNas?{^4(*3_KMk}~lAG8p5`$d#;Y_bk%sa|kz(CHSJpH@WiHiqp-)U!pXTAgnUj!oxrpY_a<9vVs}X@8xF4q+Lp4=iDDX$G#YzcdbvX?2O(PhF2r>!h=-Sv$>0L7dm}KD$sjjMnw^V=BHD8~s@8d*aG>ITaa7;vp1Ke^VA@9g$TQa(r`4bIje|JUY+N>b2lfe(HV0QKWe=I!-lKcNw?4pxdGs--Pb$`qfTye>hUY^p~D_F}J?p57mL+QmyuNu2+|l>YUy5tJbn*dW*VVrK8*F{!LLS8|sWYGsqXA(rR@-(Pu^rWq!8|x9~b~J10vzD+sAgc*Wk-<<_U@z?hGtO-Od_`B^I{Y#f3DRtazJ_F0-Uen<3nvy>J*B8BUDK^RB{!ib{X6J4LCxVonC!IBle_IeuUgv`I*Z!vIvcov;9QL@e|YCkmTSo7%SicwJ)8Wk$E!8=64x84$_XSm;86*9X+*GG;28txDculU)`8gs^>zW%#Kk&2gmp=96xcVpB{)AbPP=tV;uY+hD|Ek!*xkWzO0<<GO1*){Gc7bxTj+S@JMdOvg$a@gm66%4F5zU|c7pFgSAHsmGJFX%<SqMR^NQ{6wj6)Ak!%<8=p3CAAmbvA6!GTNZ7Gk^Wcga(c>@XWc=TXNv)_q$uHsKYPH`y-XQBxR4ebbbx<i+f+bv(j=MN};YEI>}-T8jmx)bePZdl+nL<^A1uBKN8)_&QC5vW3SfJbHckGwo-AG&7;m#zzd_&+J6mi4iWqochJOiejwqTH`HfXD72H_R$N<lUa^nIV|?`c{Le|i5$_K3Qz>?Jj$d_V?7r}y6s0?n4O|2)pV6_W9VgTTy)w2d8<HE<VHneS1U#koIY{SbXVeqpZM!_Zf#e}l+4V=d)p3}UG)|ivYOiheUf4h7Q!RO8_a<^daTSHyRpInoH%`3Lbl`qp+$`sBp|hmUp?PiNID2Q^b-ej`eZ50v?fl;#bqa=_Hff(q5v^*g`|m^+=6Y!N4bwOos=Kh-5WUI#omJkCdhEh*d##<IGvTMLH!O#lcKXDJbhPeivekv+0?)AH=P~UJ!s&2*hPX73Et7zE>Yg7Yb+J4*TmQI|R8_ynA0DbF=X5VA?yzXi%w<2gP3LURyjGc_^<Y27{B8PdE&(~*RUc(>_}jbkqODVg@&s;=FMGOs=~nx3G^!Kg<pYY1g#)DRy7zyWpLw?LH+_JxELDj4%4tOUk?dIX(aRU@v_hADCN~CaIsM@m&uFzFZnQt!d5KrKKqKE5NZzOQCHW5R?0ac(VT?z<%%QrH&JEV@U*cnNCzs#f3+=QM>HWGEow|Es?y+W~zBh93ATDa!KpNKPNj15P1JB=m`AT%$D1xPrlm?z3g1NliI*~3=$}{b`X06trosoCdzP`tzUmxF*-mBUa7M`TD{&<M!L;$%GwI+asw1HyR?be<5OlqG+e?8!wGq9A|&{E#4E6e@ISC(GBqXW->t`&Jxq}&K34;B}vWtmx=s8}7XWzI&Wj`iS^Y3f?YlD7rq%(aU;e<tRwm`ULcA3qZCP-LdLu@~+?&m9+PJq-8|t9RPLI))>Nd)OB!S6W1w*klv<JUH@e^AFdmMY@yPp$xujS(aaojd7%-mTcH0-Ua&<{Peqg0R;1V2O~6VjX%w?hV5$$`NkhmRV%V1zl#!clkwOpZ-O(>z-#Q(Tpx>1yvd~5X~!w-vUW!Q&M8E1q2f&BRXA^zeGSveZLslBjB{JOaCs_+RIHL$>Bl!PDCzCUARr{~uz0@2L2!7^jEZ}G$Nx<+4`=?g6PnjCe=$uNCp>+=A2VShB-v*mCqjfi&-a|!*-F$tPc|VtnYAnX+DppwH>NtxPpRxc-cO;t!=Bd$>n~qeI~ACyO9&|(X1OaL^IK?i^{Gw#M*j17P3=WP>?DDD7T8Mer*T^}JLT%;-^ltp3P`*aE33t|t6h4(s8#MhXWH37FWIQZpG`j?HtVy%fH*+%{y7P~+tQn+FZa41Ouad~x}4YQ_G>zxi`>7)IpKGCB3h-X;H0N+lP@EYGqEp;=c+aC+y+1MjW5ODT}Q8OaU-UA8z7t#Xw}76mAuD5tEZ7WVr)!L8P;&UbjcreaG}qT!di3f6{h{ev%V(oVc{;T`63gm{Tm6^qJ`(?Zoi`&Pn!3I&sT}%@ZdhpMr=BDbuyXz5SqyBKmMKtU<;sbwLm0tQiF;}$E9{VFfJ(IXRp;tHYs>#=L!$&@o)Ht8l0JnljO^S-{5)9YtA^z`N$QuZGCU4Ia~C8A#=zy+`k~WXr3~K#`{rv1Jh<rzReQn1(V}ey1QH^#psua75U7h*X6X!Crss}FV{!(diT*}Hx+if6trqE1T|}*_!fUSkU3vFKy*7gr_GB-q>o9Ltx+Vef2MdC@_Zd&MmuP|U-UYR9Qx$7Fcau~JM!duxS!_k^4$BXb%?iY_JPgTbe8tM(>aA8Ue!X{AVs0j$w>14OEKlod?(_+TeBv_3HG<~7*HYS@C`g;p(%3luD3oPr{E?k%|u!@W|;MAH1MkGM<0%}#%6pl6pKnaYHo4fO2LZce~XU8Ls1N(CnmEDSMYddv`!=0)Cny#*I43<Yl6TNbOxU0K}Vlm@?opnQ?jI{>KZYSd*NVQR3e$uP64mZ@iqQ75g%2CQezP+g;YJm>}+}$pk+k`&*2+4E5gUt?SqHH*b67r(pmuUQGr;YhJwp9n~NmNg}R=`%gKt)T6K;YL95y3tW3z+o@#Lo{`v|9_6+uo53WVo*f}d_iSxEEc5zMjAEse2*!7)4t7NRW1v^;>=5%pa{i~XXC($PyrsILdom~>gf<ah5!#u&4U{bBxa8NmOQ$b@U1se|)o3gH|u7K-l%$pTeKe2aitl9ZPGD}APpnt;5f|_uNZya8PX;Czrs`$(&f~~RETEqaWqSks!4UhJ`+#(dED+2p$hb_^dng>N)xVWYYoy8>RG+9EJdI=kbV`6cVlY^<4UG}ZNEl|soO6%Ez;)#FDKa5+@TP)dZw&ms7N$x8xj9r`$<eoBXdb#4lCsXa*J6drv?1efy#uxT!lcdyxzD-$UZ=bN26hv8E;V6a5W%(5=meiO$z#E5KU`WV69a3DxP{|DX!;p#hGhbf?W;bA_GOV_wH!j7B_gj@jJDO!mNgU=iA`~(*dE~q%8D68dGU1s&@yL!{-PS+*N--O<P1#>Pt18}(7I4by^-JtUiiGw@rSKZ+0dLmv3bH-%u-2>(R;sNFkK0V5(1^;TLp|vzNrVmbS>p$mXxp_*m{PeCeRN=wAF;qJZe6)bD#1$qXyOO9y3SGkqTG)Lx+=(^C@tkLQj}QG6?d^1*h%|L6nBATP2q)owPklUY%)+w!DU9l(=fat;6n94Uqjo=j{7l6LdG6`CRb1Z0nZLO<WE=ppbIzhwc-zKo+u>xLy^Q?q#cGRA02JV>ChamPbjk(g4t1eUkLh4Q>|HCB(2gpl3PvC6X*4vG({!fqM?_vm%r>Yty)pH?>Hi3@jY?UzYOb1!l8kasvq_(7+m6#O(Ybpb5Ubvcs#rK{=`vB)Ucjb4?TV;^BFa0lN=+DZ;&}$gcdEA%CM`an95>*Lf6h3A_W1*$vY+cOdm`k!K=DPJsiGybTbQhVrhu_O)T<}#}8>B3nYpM-VCU}_(O)sV@M-?c<K>o+s^WdcBuQVbMZex3S8&Py>gl>_XsdMWYFKn-Do4y63i~pJ0k$qB53MEDvh#uqLImU^WF<7O@i=(6y!PhsVS>X?2>+~+(Rn6traPw-FLRi1LIw08J49%6kJm@`<vbc;AczI0%uzD_hl;g=*GrqK_e!_J7v<p#LaEfeUYJ*Jz;zqrV70dsrKm3Y$HR>c$kFqhm0^Wbe)SHJFU&M_z$t{<fuXy6L&5HcaY14Vq@L70!|(ScmDOK?y65xhWMGh5F;_)l=xvY+V*@YowOSlZr@@4Ik(e*nPJsu58@%wsD5ej!%>r-So-b(G)=(P<*IR@66JP{t7wdnobx8UMN<OClUOt|nGf+n$r|yimw$tWLZYGmqh&TdemIdb4333|{WB5klhm<AEY=>`j(Qr=EZ0X>@i$`V*|ZO7#I3aQMGZx=MEq{4z6I}*iRuVKGM;h`Kk}<VQ3&#oB49+C)fRb7!h7Ra-8Fr+#xi+CChLpsGnDU@%#kG`c^hN#(p~DX)+KkHE0NnrEhVXl4H;^BLLL6IoNP6Px5_l^3AvV_A1o8%Tk}$EF=IGg!pm3K*vqNX8QVJLg3xR@U(EwcLr^lgH4xCqzHCew8zq}TG2qdFt?(@kU}zfPnfQ>{KY`3%fAwk*^Bv-+oN$$VYKv|?dqk#vn>L8$fpOW0F?K{&UE9{G@zM}&zzx(!1@)o0pVTRA0u*0OiZDzt^ZeOkl38<)0j-yY7%+RHf5Mef^L2DO77dezGnM>)@c0Cuvz(Y?g-bCcTKKI1a1{x?as2Q<TpCMUZ_DvPSt!RTrqh=Xu;k5#%)DIrnX1On%8a*hW7=$Bf`$_m?b;OF`DlblSG{FMOv7Xn*Hfu&qDn~qCgiOK4zy{@HktDNAuPl3FYyl!7UZC&#pKhZkE%><qfE`NcLqn$1pSIyJ^4x8CQx|WkI0I)a9`=;tZ~jORqIQ8oMy#)zF)Lr876y+SSrl}NZ7JXt##w0WW<ij`8ix)_R*>xyZ?zVezcXFM7f2erjAsi$B0965w^YQAA(2ji=Qcxt%TTrpC>(@SzbzKzZ~HCsMMnlmGNI?Z2$I8wMT$#hN2Q!^v7udC>bL+T56Dt_K_HW47|fwPKF@uompN=K3DCqB|`(JQ+<tT0kU?Zrx099%H`6pV#onHGGfn_`E8VMgNnt?KDYhzB1=L-pzMv=#j9wPtah)OBCw7LW!kP@9ttQL>#t<jGdn6@C<@!GoSQyN<tu1Mdy%Cikc{-;&?`|LS^aTm;;d`zQgwM6<71LZH9TFM5B2<sNGF}wpT6<pYPXb=oAoVPsy^ZVh==cghkGQTi2gDg%I=HNX~OP%H_<KXf6S<ga*pyT;35qd8&m#chc-4Id3*57>Q5M$?hmm)N#T4cUgr`te_;3m>>7DU^{4I%QZaIkm#c?5&uFj#DyhJjJHF7bw=m6D;XWU<@jWIYLZq)g8d%k85!h2f&5M)ie7*}9;WJtY!GGA~DniZ2$<f@lM)DaRJ9$xIZ`PyK8a&5S_U?gYNoHTp#$bQOz>FYz7QTPnhs`99@)4*dZ|V93mvJQtGBY8q(yuoYhMux0k~6#shvYnEP%O^j&c}F7>S)$amvh+XeQ_XGqJMjV`9U#~VJ{$Xc}R$kf*MCiW&?Gu_s0h6>kijz;|^!xH_tg1G<ub7!j~uUA}t-OZ9|xB`cC3}haTfoSQCdX#P7b7df^JI7;?C4ZQr|;+xhmyYFl*Z^%%xMe3}K;oEjMy$9q_JhV^8H?W~^gTj2)CrZl57Y&6nAxxBrX7k*;I`2lCygVxy(r%IX0q1H}4whLZ#gC40KTXNE9@-g*HUxSw{g_kFU!LaB~z9%gR&)WTVsPUL$?t>gWoWYRHrzcPOece1|a_|!fk?ob*7ynt-pLVjue0B5wR&;8y#^^Hwjq^+KWSNiHtorb)WQ%M+u4+42+ZIj4TsWI~^4kd7*dhmT#D^K<u6a;8`gI8Sb`oi9h?~eP5e*v9!z+y7861@Iu8zS8yfsqvp+gl|v@%kLWa!c4DT&4;uLvcyObiAX@G)(#{D_DwY)82{K4LJ{^C%HfR>rvO$6G#li#tt-Z{Lz+4t(Fdl8blI_;aBOIk#<)|Mi_>e7kq<TLJB0{0oAoo2W1fkMCYuzsn(1?WR&2c(tF=EGpEN*Mb<=ql_6ZwBgpaX1~8q6X6OU$A;naK|W9WV2-!+j@DSB4;dZeO*6?0`x--B7=1@MNj>%n=9fs84(FIWmreZe29XpP>5wATiRLn*UyB-X$5dm7lS{^ql&B54cT#9C&-lA=+U7|qjLP!|juN5P$o3Tay(g-~qnwKsR$l&)Pt9h<pD-F*MU*VyCWnTV7aU`YBto@`w}MxSM8NcJc|ZKo<^jo-kXF-0Awyza*XK9YH-w>Qk6DovHms|ezdf<=C6fL|T4dYz%!1arNR_(Rh<NF6D<1ZKAB(c#gBA*t+0k>3)a5#3l)y2s*!TSDPeUPuFiAH~vLaP@?-tS0x7RBo)P!sVW+YksifV;={Jiz;STm)oU6?)k&rEPx+PxweV|`O1a=UHo^ghskq}1d0ZE9auTY6|QVGs4#r+4WfyZY`fOcpRUCXybu9$&|JH*XKsUM2p*X~y%745K6-&AM8P@P5$NP(s#GHK5~Dua@yvf~*HUWzKV+2<mv)N=z}M?^!ATUa{@2`S)?PtyeP3<=Ld_pGgFj3E$U#FL^41tYz#)P>K`@A&i(a3vGTp7g7kBWS*n{k{X7u6@K{xn=eE*975Qjwh@Mo#bieqU$13t-X2@ufk#L8@ax1*n6ql(di*0{UKIW`u2r2lY`*-#y0d&Ln`aT|SeQ;G@1t!sm<p;{=EP&hXGpA{CdqUo^A$0^aM;V7sADcdtxCRlQ)ledT?}iUuObgb?Squi^CUI4wa04gqgr#zkJ8i?7|~;4Q|^<AJX}L_;Uwe#leoq;Ov3fPyL@Gyfum3Ru#KQ69ZAqgN|s%1D~9YdATAe=Nr^-*)6F4K#6hE(WnuE!#av;_A>>yEyq;mF7yc1HnYuEK1Rvv+{`2#N>(6cIrRzcH1$*wc{F8An2>4mX4ey$nDb1raibCcsved8!@towBPTg&X;gl)=?7N6$EKDzDs=j4J)e4_tZlAIkoNBNEgEAYSXu&!abA;82(+qtOrO+bO!r|CQ4sI&T5A^zp9%!eHns7EC3C9aj3xs6zwl|ks(SQ6TG`mvw*7oL^zn|KwTij9+pWI6Qs?t|n;EXRS=mKXEX=VwO%bK=HDBiH-yAuoK5Y2Y|EjDJ!<eDmpkgz1b2UT92OUZYV7ZCg-qk4vzPNKG6hF}3pz(hvdBpNY8NkXZi!F?|(=0-m<m0@GDu1L{?Q3e>EQGE`2q#jsv^fKE1W!rC>OeNbOGED|=5t2+CNI6}Ss^rJ)w$PYP)us5a^dGCV){R_|YCAc^0Mw4~nJ;XGOvrL6o`2!fQ-pM+2XcRlwrM?w$$<t*fgY7quZxTqxwcbg4b?h$)r;eMiY1W((i|ZZl%kFy;<_9Q$X;3$>)=>i3Y%IvWfS1w5RIzUGb$geiu^$Kfi3hieRUf|N!y3e7E0_;z<q%;HD_hZUqp0Z@(^fhQ;C2)j{Zd2Q)T3Mv0@nW7^U`A?+OS<h>Bqy9HWRaN7&^kf?WGb=6w)Tc}%CR*ShQu#{JJJH9r11jhI)WOYt$y1}N4AjH+a|P##S=7eN*i?>F1-ws+K&rOR(=X@J(+`pHr}T=vn!1xcdV*JyLf700q|kcmV$W1vn&<pK~BI9Xi|xdRk;PC48i7qp4NJhHsSurBDHHv`HFrXlp!fP^19t$z-i_$cdg2u%xsI`|h2hV^s*4mk?D*2k-=ymrccZ4iceZ0*C*DWm<1lJMz&d|=EXWK>n;wFw+vN&;tGz-lzHy$upqM-h&7pb)G_QkV0+cTS=x81}u$WA!G@7seb+ifUaz?}Y)vs2?H19Fv*cytEW11KHw}cEjx6e+dOJh9q1wp27IXbvep}5)lXO5=C~b-L|)7-8tAD;R56~a~yNY*&JDewhj^9!pI#{;oJaRiZ<D~-3}2XXHv)2vz|<UW8$&AvW<uD+}>3{(NQ8uMrl1Ma~1#Cdg`y79;pkDTP_-8?llrGvZL<Bt785(w~RCN^DkxZKsFI3rl`l(MDp@aIJDbhzXJ}geYOuH8JCe-?ou7I?Go5L+>QKd5$t%P0pI-=qdHrS)m3j?J*824-uA8za))W*KiEA+j&(<L`&CPaact!_w!YVs@9BIZU+4Y7|1<s15=KT68bw_f)3(0R#q_A`dm?Q`;n*9`Nrc-&bHa46)6!y?%y<@DP3o%n&GXi<w8GCXA6s9^EFUAD0EBDHw5y0Y<)b3Axi|mzB(4<`vxHH=_oLb>L{4qEkiJZ?1)(7eT)~8XAIb4iTYbWYUPX@iwjG+VqR42wIa=Jil{w+ED7n=AcXdc6eLfW72O+@>5()^&ve-h7!gd*bi=w5Qs90=8j)Gh{d|6_owM}IFBhxy4m6^3EXoz&)gPp6u$kl=wn4)9)h4J>$oITX3Qwg?2F(s2%^#J&L`>5`%Yv;1~(y=1lMi*MC3Uy2q{QkS=4FzSZ3iT}RTxsfw0nTy{@_UKzkUp8&nl`yUx?Ci5Ync3U=0qX~ah;QEXINI-K%ZZ%`re|SpPGQH>M(rnnyw8J?qd4V2S#oe{0y`&Y_pJRKhH7KgEf15@G&Fh?MtwUvgsW#OS(P2f+6lz99yVJixe<<%j))EDc()n2iq3<oU+B{^CyF)cxC>%6-pZgEL&)=1PZeC^ZGFaa=)GsAPFyhU_Y1IAg6T+nm(`{J7ngIi9+1Jk6L8wg7Y<1uu>2#7??QG>T;-^BY@*(hHO7I!(254{vi{vrC&t?+sjWamL2SZ&1qU+*pAFN*l_|Lv<T0!@&GCG80=Ce1F#FIkK0h@l*<s)M30MFJ05%Vs4i!1pAz~1eAvH`1`I)&zJhu^7l;QX$+4|75yR>LO!8a+lXyg8TFQ99ex*+WDAtA}k!r_d#Ib<&RvvQgXKkMugpU)%<eMZ>*g`iW=@Bmy$~Dl2Fy<iSAQm~05i@voIgbt&coC%nGuv#12saFu{S7o)sV}*~evZ`xn6)+aqKjWcucC;=3LkcWCEZ(w0m2D+q5h@5nwmMHE?QWFSnQg|U?lWi5RlogqE^A;W@h*}Zqx1ygCExWA*@zPk!#1_Yh?kdi0#-t;sb*-BsEUJ?QeBatz}k9)-dK`I$^yaE-pT3<+viWqfN-Q^mf<){MMS>61+g>h8I9vlw<hcg3&XzvH3CxAcGeQn(I<LeJLVaLT5)F&~7RC3W8C-0qHSdDg%8C{j+~Fg`x={Hd=Qr{eLy+HT8kTB>J2EI~;R|R7)>&g$h_)Q{&Y!$W$-@cZ}Mgc)hCUKoKmo4cakZt=k}246)0I?Ji@FJ{LpZO9G;w8}I>mZ`XeeNfFhW`uiNr(EYb^vEz9EKFiNj5I*y$$Pvr8ikwIX5$)*Be-o1q|B2WqtE|zWfY=9%evt?5N=4rW5U<O;De$J`_dWo*k>Wdo8N<O8w1raIlsMg}Xlu&?4Sz0@5OC{(BpiK>b`b=q)Cq0@xHF66zy3?{5f(&Y%`2ElhM{Qx&go1xDp*VP3&4Aw$~J)WRXGD+Eq>on|D8A-YfP}EPynn`1U%`h8Df!3x^<MO{!QrDApRU-kCi+XcnQy@3jUjxI_7_)L`M;NVVg$#w}^*d|M&+$+g%Ysg63c!l>W~ZV)2%WAT*>z2p7F0_;bofB>_O%2SPEegDq&uhT(`q#9yZj5o5Pt2%KKJr9=MDs>ts@WwZ5vfkT54v?e5g2g9F@fV$ls$Ph6-b&}1_m(-Ni4VD}CsGOX%nltxENHqVS|B%H>8J8wk#3*3zKed{{ssHBr$uE}kZth(3$KAR^?=AoQ#9+g{JNH^Ffawq^Oo#;f%rxg6F_XN_IWg)SVH3MOq`BK3^1kZG@V?$IyT25>KhyKROz^(l)Js1T9@5(Np4Gd%6}!7yygv`r^S&-Pb-({}%=WV7>7tg`lMF4dr!>kfG(RN!DAwfq+~ue>y&R?YkuOJ%G-K%sr31|ml5fV>f_5~Oy&g<tXS)H>;rL*pWEONwq}L==&a>Bpb~wW&R1&t|ymCtFep2|3V976EUWE4GU2JVKrBYghDeD)((<;Y@69t&<X*>d;<I)<mGp^Jev@?tlQMWA_d5qF3J(KpYoE#yMz=%q&&s44jZvTp>G@h=|;EGBKZ~g#JDLiLA2rdheRxvbl9bd}^Hgr{#N_ZljGo`&`sv;)j+03RN=O0d#_Q*=BG*WXlPpt*PrzDH%3U#Ebhk)O`TsmjDh<x5#Gv`;;+Yz|`BTRW7Oyml2eqp2m{ANxn$%Eiy1bR;jBk|t>;gyV{<msr=^KU|)Cy8WApg57#?+qtGX|j9zr+F?55CmwMvI{rQf5GjgR286H@FU8JT!Hp<BKupHe)M|kHV4U4={4b~-KV^4Yi<vU^B8TScJoUC=-YQ)<of+29+2>9BJ8!wsl1mTL{s34+sO@n%{VvHv_4dA0e++lqQVGJ%5!Q?J1}dE)`JQepHW!${(LxL<+c&O20#({@YKro_+m<>i4#-c;<C8+;Y7~nn{oygX_W*owf6X#aVtz1Jo(P@uZm~z*Iz3zUH@8@oBa(8x5b~1iKZ#f;f)9N2h}bEejaK8_ry+Z@yP+NG5>}=G!ytz_-hmy1}Cqh{MVs`fId`?=rihHdKj#jmIdbY_P|7n7Brp4qJ!XkRIX6_@|-CXSl>g{@K+#EoV1)MNWFTy2Nl3Y9oqg<;otOu2nc{tu0pq07}<q+<3Y)(N)toy{$vEvEguLEUMT*w^4R|ZYyWpZP7&dD2!Z!QvfLhdv*rU4ArGc3&yl8!My)w9LvSi?k}RdM0xBjGFtEAfg$Z+WWbH(TxkZ4re43app%R%+*B(#(ueaLdCa|0eH@FbFlc_eZXcRG;s+^)2ry;_6Y=8(b0uJDAGZVNo-39I{>|d!OYH{*nj4P-x;1R-70j$3r$CUpgF}0=?8;M{_cT}A0F|`&}NZl5wG(ptk2|rSc<tn@~ZwM>&Qu+uI$fo+Y$WlW3(8$4hK`?h-EJrwhYi;623KEUl2e{;hc~h`y3+0g-5xA`eApaefJ^1)<sptwN!9rqSL2R}O;UiwDY72qvLTUQx(d^0**1rI9c3qH+X|~Sam`+DC=zsIcOV9!8u|XV=fQRdKX)hun_>Akn>&N!wBVzp&YVQ1tt{nfDom3eje6IyUA}}K45xT(d0ndL}H*S=szbjERm+s+2&m8lY!l&~Lu+gaf7|1qp3AAPn<TF^`U<8#1(a>Ca<5N8*)*2BLAS+&Dv}OcN{-9gIz@(rgl7+)>Z34Yc=F>BQ?k2|Rnm`SAQj1c4joKFF^vAF8yN19mE0ca$KCihu^5BAnSYb$*K)*G3se$&d(--l-lx4X>jcbTG1}047Q`9w0pavDYHYU)K`3VOVxthZP%jYu_N5GTa5v8hM6Bt=O^GJgDrz~>8u=xy3YsSmS(2^jh6dOAf_P5-|HRF+*IVLsZwRf`iT(F&4%K<K!Tdz|q0M^z|^v7R~X5<0Fo{+Ib$_eA|pMNRSm^6XG9uBIcY{B^Y3CfA5tro5K(lLSkyk7Tx_Q4|yY^N_0-1pA0>H5~0Pn#3p+UuCy=>C$hw&szpW*a-BRMmNWsY`2mX}Bg(XtnD#WLZ#KFq{5s6k6)eSedgBQ12E2-<3+wE{uJvdxTZL|D!*?;jZ*HW;1`MjQK!BS1vvKDv=#f=V|dcD0w=i@XiEUhHMVJk+U=vNXGXaMI{IySeB+LFLu)RMb^75{F<}65;?Hk=f3rNIz>llxs5*`tq<ipd4LKVg~jn5L6025gb&n*CKZULM}N5m`9ji4v$1O&`(=@89H~YAX^S7s?m(-lDx>DohhFc%&|xzsO@0t7E{HE=&lu#TdT_b0DDZ^OYDj6GQ5Il0YTcerg(JhXr1>x`&GF_Rm**I}fmTu%$@C~E5$690HrMi;iPJ;?oag@glq}k=@q<9PI-_d2%UV>|AachWk_)4$ZWvMvqm*trflWCAvWC2CZeG$0quhoVuF%SD*z1K+%PY0$TJC{aR9EQn$g$8-e6Fke6B~2wd9EKYaucG!CI*(ps9gyk@H?bLW%3r7u&3~^LBg}MLz;5Fg$qBKS_O|j!=xg*!ai*(B_1y1qxgVdy>vF_iLW7`sYwLfCGyc6#Y;_Df!JGa{Ro9CV9+5;`2(?^s<-p75IraexuF`+loRDTeGumOg9b9Bgx7p-_5&<ua-t{&2u&0pLX}i}S<2<(Vdff9m}QOU3gs9mp)GuO4#>aX$)~k>enMXN6iAdDAOp;CzmQ9ThZFi+$pvLI`q8Lb;(-&~FNHLFAkZ*NL_pKuhfj;;4;Xgy035`U4h;5!x|Pju)f$;_TtSjF!@Qt9j`Z`-PdlVr8JZ7mPGEu!dnd3_?cxy|^WB;;o8JED6PW#xW_gN7@3wqF$E#KbCNacAfHWZ73!2=@2fPTxctH(HsnNxno!8yubnTkl)#piH{9fR>MOSD@xFNP&(gjZzt_Z1ChTG-R5u1XfqA?0N1<J)s$hHLg_LrRNTcK74htrV7(OGX)`!TLOeY=yGu_S4}057O?BpC=%+vDs7m7+!``jX&59Oki5${e-pmA5#`slJFFm^d|bV#{&sg@eywQ%3p2sTD!{0AwL_2|_Z_pf@HbcucMpG3Et^ZlAv^FLEW&a0%XeD%F~kB?P$3FCZ+%zI|NpyY6M1&TRsRki_odj|4y6<v(dhI)nIDk8a}|sNW+>p=R6f((B$HvV6<>a-?Pd%@ue+Q=y#{h4I);&F!$NEVs%L<EUO7@F1;K?4|M8kyAKNc5YAEn#!f-_JjTv&s@galFM1cDn>p3qy5@zcvjQ(9wqEqv{xC$(*()lN=EtCH6e?YRK%O+*@S1=6i!!_4Vxjc)J}wv+#EMmy~WYn+nrhB21SFbn$*%>&DO$e;8=d}N|lOnvQth3atg-XF*TpP@tplk`jd4reLE^8y`Dk9V&$ZEc`%uu>A;_Sn2*%wX5>gIAK6nf<R#wLH5$qfClyVi&9ywm@yl*L|Isc!N@n7%W`dCXUiU2V1BS?C58}65y7nNQykL-6-N^xbMRryp>(hSt4K{=0fuTCKu^F3d5r8ZH_B6s>bL;m|C(5JQ1Gq5o`2Qi*=vFq$rQI;wM8K&nxUUnxJSs~5<_tICj5qWfZo&p9%Mp<5Y<WOdp8g}HG&iAVAQ-YDoBnRdcAJ6EN<oPV!x`WMJ~(>Qbi}co^jC&|;g41Lr9@oI?Y{Rc1h&x?@}-U}m!tlfb)pkf$chw~`p|1TJ6UOJ;uCOQd2N@Q`ZfDmsfFN-67kf4HOgzd`QMC+#8Zvn5nCwnOr#@+UG}SK9WjRe32wqmcemyt>VEsm&_3Jeb2YfH?X0z4D$Vgc24=Op4}-tdS$qNEvbo*^k`cQ}==Ix4+Gd6^=RzSXHLe$m#I-#8xWru$9gRnT+Sm^Vm4pRT^pF)bE_LaG>|$rnUI&#;j__WkG;%b|kd@p)T^!;rx#q_};-%p}d=^5{puwO>Y-%q7h)Z_lh%3zv&n_dRULnwACv|7~oN|a%vhZa4f->lVC^*ej_{3fQ=_i09V<@vCF{z*gC&;hN92Z;TwCIH(kkUW5Ug%F4=4SgiJr=;$;2{deO=u7uI!H@QSQm5^<J8`nmv!?+QERRY4oap(FLslA0D8BFPr%4V#|NXj@qxg-AGQU%*$TS$pBZ*-k~z}fn%m%hW=N^+5my;_!TUh<*ep^h798k|d)>6ipFw$TT6`;vD#giOKqn1NzP!*}y-ft#<7*?$3TiYiIB?^9TWnG{PE+|PB?!)i$Z3=V991fexI&-W_5QX*35HG;(?!=AVb`DrL)Ao?Pv?C*a~fr5)pNcIM%5Vw89cGuu7kbSJerim4Tee|{}5k^iQCMlPCI}2Mq4l!VQOXyFo}T#z`lhAeHPez%1Q$=4j;u=MtOxO=vnuyN+aGoR5Bv^Y@lzI#{TGy_RNN{UuTZh88v8LS=c<W>m9yDAfP4y!DaWv&OD_DkeV&-imIy`&;sFMu`>WLsTT!k&+zUuNPoNJp$dNQaQx?~o%#0ZwTs!)KV||U1E<*{fctv+gJBv248nx?bbf>^B_MmFttD7(20TL?ih>HgdI{)RA<eFU0OFK36b+(5r|$9SSrLb~%^x6>90xUo=^Y^-a45_U+G>druMp>5;AH!`6GAd{0#c*zc0gs28-a^mj#_NPe?+A5=~)L1*VqGw#XSLx+M$R&fSrq-Frk>T`+>=Ksg+UgSZczA4PN!Y`M@MlNbUj3;Le-^vNPar+|nG_$d8@DV(9G5lVw10-<8o}0yukkaEQ%M@&BxIlTM=QxOr?rX32uBmcV9*jR<gf=dc9W7i`}pa@&n4rTrC3haLdNsaM&ZN-~tdp)My+L^}2%xo#`Ze6;hmw9`oEYdz2Ekj*|M7-t50&zIoP{Ws+~1{==ch^j{-orGM&9S^Pq6SCkUX1E=J2IIuwMzu8G3cp8!k#`{8<wYvwtlMbi5*-Y;Sl+|7y}b`rxmw3;Welr;ipyXOXv_z)GZ@KP1rRsa6(Vl4I&h?g^NIN7^E#Zq12?-XzwONB7|_^ge%ry2*3Z?#r9Da|)4@>r@XK;cz-v^?=Z;EqNHFYUU33^{0nw^Z2g9#3Fn&v(zDULjfgF%{=l*Y32a-W@o`>ir8IAtslg7+#UT3t%tvw120{Z4piJ<A;^1n_0qu2nbTNj5pAlA4N$}?NgYo48B6Bhs#obVpCm9Y^wW&33&N6v~j_TiONVhvrPn+O*;^?M+0Me^ur`p~T4WwgJieztkW=@^d3Df-Y6IYTKqc?WKhq0Yiy^N8F$hH{409NuiB2wrfVPUs)m$P`GXMx$fag%er!x)cES+v`JLmt%DAWdCc9a@+z3^9S78_D3-SGhhs?N%Oj|?<AP;5>it)%yKyx9I6DIyIL&ele4!EML`%F63bqrX8Cf4cl=!cUQFH?eS|m-lrv4o2-ur^gq#|XS6bL3(pZe~7(0@W1XtwPRAJ|`UUOH|8Tme;u`|tBpckWdpIXaXiQ;RIPo=c%rT14T&nfL22I)PwPx*Uc+4*^n_4kUS2~Mh~CW1$Zo0q2cd>&(7bk_bklumM<tJcVfpDi5MX~+k0Il4mJEP1w)|K8rx!*MJNcAeHxV4RO4L37)969rarq!c@rZVwmOdmb2n5V8nH;ow}g_x!YkcjnzrevMk}d5AAUOYR6M&#CDz84RIYgEP=|Oqdy&m3qOCVBci4^`YI2cD@iz*Rne1QhB<LVc>Nr<Y0M+n{!-gkDC)5)d4U@y7z~z@83(Cm=|!CYcPT!fcX65wp{}*sHtb4-M&Y_V*DUHdv;Y);B72NO>*3aUNe58-pOO8P!RYS+!qf*)HeVhlS^>(FXkb|OXv^r3jjwU7Wvdr@QV+Y@lDopOwFt=SZYqjIF`K^9<1dIp79q@FX+*!ilxL9oX54SH~T$K!y`Fqr`9sf*aTVWsTstlm4~WUmKAOB)VJT9eIX)OyL%`wx0B83>g@N44QKfp$-t3==pll(PHaX<>&{Fqy_kaB0`q>!?g{7$a#Kx+I7oG6JEmzKKGQLsSgVSeK)o1t96!MYp@!zbTy5v4V_BE+X98D-I1Q|F(sHw=U7HRg{j<H!a`IzJhztB(X|wr8N!CejQtd*aWwNV~D`KwyHk}dU8*M2j3-W)fZ#d6=Jed+K$7REm7x#P8UaMCgLc?=e+^gQ@`e6(>Rp`n`{QfZC*hAd-4*=Y$17R-8oZbX}llN^vfXh;i3u{E6-X|_&{jh^-zJaFGyZ|Z&zoq~Ai&x{=flK~9$4ctP+0mR#<i*F+4HMHQM>(0rL6`01{+6`EQJxHf58cq(q|zamZOgRk3NBs2-Q=RYw)BEp8llx3!}vcyHal(f47!-75KaP%-N^0qUeNiOis<-`#M*X4XDPL7xpdtinkNtXT(+xUO&R<IKYGJNn%&T{`5<a8GPdRq${RaOeS!6EAv-gItp=t|RbhKuz^h!^T_u;U*2bR=;E$866T~y-yauHDQYY&X17`JL09r~D8J3{N)whI@Y^`Alli97G4#E;PM);jfo46JD)Q1@NW_3hTswna@fq|ogQ8#o<WB50K@a`4?$!!BX<hr{XHF4*;BIH2Q5eR0E&$39yCKtQf$fcX?nOwA)pUk!l^uNAyGr|rQt=xdrn@Y57_I4se@U2Ub>xQnrpgYjC&K(a+2sk|YMaG7=nhHus{w^VYuMd^vq|?qW^CPl28C$qH?>|6h>G3kH<`{&yD|ACUh=tO_61s;|e#Rb-vj4h63{dZZ_SVesHel87eu|LMC5Qq1Bw>Px-r?C61Xd3NVg4i;(MDJ+YmY^fv2{&G_Vl_uuOWL+#^%q#E(E0AsURr$+J+k2+LaoYF81oMBd6|>J*C%Z7-e9_R@}li|IJ!5Y(OcEQ5L|zK>)mqn@ge_Y9RYwz8lKn^k^Tr3>*20kZC^<^4&d<0bY0+VF|kKrt@G%{R{qxCb9ZIZx!*Svyx3jk)GN5*dF^!`BM_zzn?J(D9s(hQi1v@ukF`x-R-pg_%A6D{g&W(EfSjzkI7Lmff^7-069_<4a$Dp{#U^cWEn>$&0c@JuKie|kM>YB5hh8}`A#YixU9;A34-2s(;qH7#SxxcUBUdV7nCYrUDq`E^MBxe^Y;tse^Fzr7~P$~RGH(IXD-WY-nyYV0D?~4rvFlI-B683eC)uKFoE7CGQ9d9$yUFg)E|E}LNOfsD@I6R$C6Ua7^8jT@ZE-*-OcADQ{IRSPWQ<0)jVz{eu^H2q*GZyQY4i+Itg-WMIG56-(WW^ifHR%0y!^d$hhW)_*65+aYU)Q`pkn9w$n{}VN^37ZnNL6WY^7izLZ~QY{EfFvdR0BpV`{n(!*9I^;@9`Kl5N>FEu5J>F_QBw|xw71!MF05g}Yhq1h{8q?=tzc53O_f~RASb}Dmq8$0|evfd9HfRC-yYcOV*Qe%^v@u6B+dLot5%~d5;$|pg(YkR(ZUCHiBvsswAG^L2HP;hVOD4)NXrE!spWU4w<x=TcBFdJO4>{L?8qJ^2|*^<~IL&l17`m$HJZR>%eHH9@Iq!J|4fdv|&#@0>}*5rQqJ2|s^!broPu#_fF{Yj;}{N?#u_?cNxm~H@BT3N#fs?B=MAgAfqI+P@&1~U=)$*vgEU9Y*Qf>DtMIs&s-`bUC*os&+IgPn@@6b~inXbMC)aTCyhlpk?}?x}fc3-czoE+xs-01~zE<OqnyLq~|feJOOt1PHR#U=Xh1ZqOO<=SZ*PXD;1UNCpEu&Dl+$lSIk@$lFuy=D#Ckn^qo6T|#_|jBpyKiDCuaQ#De{f+Xp`AI!mZ0=&+Szo3CPR#AnEMxHe;KxD`uZ~_6O|3VPQEP-dhXj`}$r^e{*I@{mxq9*kOHRFz7&e36RRo6cN2EBsRa+`z25}Y=^yS2y5>TDvueNs-EZ;%01zAI2=ZHVO1X&kISEEX)(hvt4g(4}rK>_DqI*@}!n7~Aai(P<#Q&5%zm{%!5hX?S0rZhGHbMk-uy@3uykEk0Gft!1OZJJ=)*J>E@FDAlO*8go2$Ps|Nl^tx!@OIh-|q<a3a^?qT-rUAWdVlq<ni|4iH?O6w#YAeoFw$|{-<}-rq!uzX3Ijz2y6LO22d~zCZd(SUBG$n4YFDk`ITb2*21@MFxY+|;{Dw>R7GVUh_p1e$TG>c?n^>MZ6+lvj<+xFf}i49x}&o{gqzmsKPwcu}`1?zj0co5!QxY&y|57a_$6IeV(10K>0d0nruE~FmYs9&hqIueP}j<6GWU5l(_qi5(WWd|SrayZvo^}2j=+bdGKx$CmxyT3@UXU!?<PChll_wBrA?pTIi;kwRW;qJcv>VC0o@7mzO$1%@@!aJugxX(jr7$17PbGklnk?&o-TqD1g{L`CCDb{u6!V*Sv8@!=suSdW4Sms<k>C4#6_35#Pht2(~;a2UX%ik!+mt)c|Cz)y+(j$el&w3Be4LOmX-s_aN_M16!+@4+c#NKsW?%ZDAy?K2#LUmG3_Xkq{UeN89decz+gl1lnM$FT5vq0>)ac7lk*N6tyb7)BQFpp-#<+gcaHICT9lNM|7_Z~yf&E55ri&w+c*L*FaHDX?m7C!zGJ8BcHpNfnd&GXKxEn|yQU@dRqj`n)odhaE=flf_#@-$Hov-cjglC_Nb|L>m*^I783u%>m!n(v2%j6W;UK7A?sP{RJK$+?ci@FkszT#*$$J>JWgxDo?*Ro&zil>uL>s$N?(sgUpxRW6Xf)%hGx4&6=n9MrwO7CN}{JpXy`x__)~)0)wIrj=2B_Gi{~Gd1bmO+WO?M!@rDC-OVz*_?Z8t~}X{Z|k`*`IFV>PGyJQx2FB6gs*T9o08-*(_PVmlIw@agLVeya3=OD)o6ypt748|X;?eR?Kg4o;@6iGDvxW=)+geG^ZTd@=6fHGP>DGxmh7X+yvZM~Z{#kTiQc4i#5wd+V<E;Wa$w_T$t^|opLQcOuXo3A_?no~9TX>Q%Qqs9!WW~m$KXgUDzHNFHNA_RP@OHZ{I_uwyg6(h(+>4827A?R<^%4PrefLGn?ld(XNx1*F-JuK@n@o`v2P2v)J00ahIHu+@voEartlDd&NYiv9y1?e;uK+fw($wMMBw;i)SCG&`!VV$Rx3m2@ejq=FM&zSVnx(OgtQ7W3m=Xg6jk$bsusMW|Ey-lz^hdwe|NP^bh^>1nRZY~(2gDO2V)VcZ|aVtRPc}ZW(rr_J{gN14omn=hYPE(_>}Bwx6RNY>pz<LO~di4hVki>QDnA1I1h=Rm69q+`B<7b(cHK>QKL<`#;D51kye@igSApdOsI0f8nr^WXN)FObgn#SHKKE&WKmo&)6!(bBQJ+`IR8dD)qUKsKXfK?>PZkw!K9qds%(<l`>xAT)9|cW<Xu(Q4Ms0oy9CupkB{_&zOG%|SLSU<rV7HfVhUk_b;s}dVuI=mrF9wBh4ROLnYTLeUz@+YT9qCQJ|W6$X>&fKf3Yu$!YQMq)$FOAy1Z+YMK5!DW^UK;PZi6jgfqdQ6S|fu9kRTTN=Nco;rxXK3#vn}cq753o(VjoEOYTjjdddO_xTScXv1RZ(gpn8(1NMt^z9geBV2s5^Sm_XeFWqxh4aZxhOcjSnBqPkeATKA@zRRKT4_9A=da!PXTPvQP(s<1Wq?J+N$+N*yMX#i@PQgWqus(o;-LD;!ji9p7FJP$Wz~3{7LXkJVfh4!vQ4IRHwldOp=afpggAu_pRvBey>)-T@)-I?XGb%r72M|lBiwo8`ps%im>vzQ|I3l4^MG(CJwZsyVbBTf8|Q+@GSAYPqJ<_<3Is<2oxXj!dB*TY(e9}CxNZ+Ah`HdqR{S>c9AAXg$5&l=63wNk2F(qvSOKYoEG2}Q9FMB8hBUGKb!P<>Uwb&Sh)%*^9Zh!iy;Ikm)>Wx|?eoR0cIBTFmTzq`Btx`?XPZo2I#d=6w&#LA>4{GaUU#K#YTCV&IhkXL_}=}VK8?L7`a?T`i5fw+6VtfHU{-pd-RYTun#!C}n38a1VW1LhJ&ut6g}oEaw@Me5s7ZA8fhwUAcJo&5i4OSBvM<W#g$V>3LCNF7jT^37)uFOyw8gtY^-k}O^Y<-j?H6ZW?{%Ymyx3PGWFmZ|AZfT)7jY9;PlUc+Modyy@G}6#Ir5{FtB$bHSj1@lo`lTO?wg|j*QT35L*2e{<4;eD3K^bAmSU7-CwoYC71{TF%N|0E<tfG3vxiWU$R0zCrLynY8HQ5GGK6f|-s`L9_dox0-nVmZX72mCujO;Cx6|jJ+8XKqwh|RMLT{opTjN-K1HI@14bnpkAKK(qvs(MwXUQnE#(szm)%6`?sWhUV#lHH4ZSU*WkeA-<EL16&4b&TaGT>|EeBt4CjgIu5vf;9_wcJHrky7`m0s*U)&mrTU-&IPJt3~G<-HGa2v%N`@uFl%#fw$;KBknDPxtzap%u)%}QyzDx@s@`ow_JL+`l%DlxBsd9%TQsp+;1mq=*3v&{H2Vv{j!Y+sd*lCT#X3J4IeGl?ZE{7aiaZ^wywUs_-lN{_XBg#?kjhsFW^;P&GY4yqWNWHqU3oQGO4dB89t<V<#18=T9l@YK$6avyWIDdi%3GVFZ{)He@Ur|Yx&dvQ}$AkI?CN^X>g&bOZcc7_quo=s$M2u=DPC{GbPz-mm{U}4hBAa&+d#*m*|Dh_Asun=r6G^dR^@6Ib&JO9UFX7FWiwBJ&<@aDLZTG#m40`OmfaX4>9*k(LLcULyU7Fvz6V`>sK#bU+nFfGyZq``M>LITtoL0;>Ppm<;u0zm<tE4DbKX)#u#MiO8@P^Zn$z%Dc4(UX&o!StTMjvnv495j&>dQ>HM{l+}1Lk^eM9^_h_CZ>bRHo7bmZ3zrV1`rS&}P?Zz|%|Fa)rsM{Qo%!OOrB773M>)EL%_1+d*-N<?oXB0M}{EL`R8<t+!`10rpV)V~ErPkk5Kd|<!%(h%d`W&5_Qda`r6@<rZ&AaE!%GDa#Sxih&wo*JQU%lROq$S~aQ{nUEcQQ87VH863=P0_mE=f3Noo(TCVE68{d9E{^xAW^+yFT&P^wXjNUs2P%HRt)dz8rB1gVDHpI{lh=Nl*E9*5?DZqGh(CEw?Pa$oI1Sb}on(*IkmdILR-1eeL6GW$!!VD?gI`ifdUrC}_psu;>iluGbGV(u`5{>6D5_jZSpD#aPND>&?E3wND%i?Y2KIL8~(xxV<lRG`xXFlSN@k279_WA60+Oq0R0c`<gFLN<r@K(@<Py6JF;?DaNqLCDB9S>E~Xx<uR^xwvgck?{>vw)Ni*UZ%G$5-PCB8CW+#m=WZtigvn2@*s6xbdmN=Sec>SJ@$h5&Bg<2r{?x}^0wPUbEV~MtjB18*OU>VXEjePc8oS~6R?aA<I7`9T`n5uh9=A-IfBj;Fhtt3fLc*0qE7fgRj(cMNRMh62f35lD@3ft$De)PLe5bmWTR8o!*o_KJ{*pnf@Ak~jg-#m2dfMz$@z2ED|7I{)yn55b!f9AeF~Y1=+wVh5U#N$6Nf)2-nT0nm;sgpk+xhbv(K??+PlTNpm#hD4fluIGrGfWn?bAtx?Z<Wxj{fF8RdMMSrYD=MqhE>s@nc8xW>x8Y{Pjty<L?x`s>&bM9sOtF%F4AE?Vl!_5@-HBDW0fXfm_g<wk=WhU02vHsBgU0a!%x-_tvswu`PdVf><jiHZXz`*VM<+q%F_CDj$NIeEgvFP5L@Pwf;hYQqF^;&8M=SNpyw_wM5|b6;dPhlZ~<@R~B(&Yx$*F)`X*@w5NJgTYk@Uq=&S(WFL1TJ{6_Eek-yq2p{XiGxh9rWMOs9S*(K7ktTM*&VLJ@njKJNmCE#0M>sQXWHoxm%JtfPAIH3>wc&ch`rt@QwhO=3zNt2UA0?+9H(OGuZ>?*N+pNQ0<)mHvIC|#Sq_5rD0ZGDBEkH}C?WU-7<62+&!I1Fkf$#XkHEL!t-${wk?v$FInx<1T{3$hCCBYj~C1#uR@eF(f`|eL|H>uNweZJPTd2XiQC$rin(|kT>9i8P(xfam&ylJOP>TcWjW0R-)+M>Ku4+I?oU)9RnW8!DdUz@`yPan)x?t6aNlEWEk6zYxHe`GT&>^a&)#kc>{Njamwbr&`8dtztc!&FR(ciTrys%#b^Tu$Tk<$bIZ|FS^aZtOtT(U=AE-Pj@4+WFMLrt^j*DIb^KVvW*%KbO8InVTX(zBpXPIUTz|5<_y(9XmNvHJiq|V9*ns_C~7q{+U4~SLv)>?jo1_KgL<t^tIB;zQnt(=^Kq%>^DrC8@l|+vc`wk@A?%ki)HX1tU4BtuitsI-BD~BU@=)_MN#IsxoaQ7I4<TStG+4R7L6NwGvxRxe8xT~03(~nxxRJJZG+8|n&8v>5Xb5IqkM{N<-PS{p?2eDz=&lN<J4`xf{}dme#>jUZyBLm>-nS+W&eiTdOfv&ttjb_7>8nI&CHtX!qAPI%o7exp9sNa?c&d*U6g9gHUoOsGDdBgE2jJ!Qr)I*2lLS>Hw|gcm+akiN*S$u7H4f)7}+#5{M@a@N{w~L%YJ!;LED4y&d8<QaQ6}edZ#~+#nz0Px8d`IF)rU{Y3I{IT3%<wMpL$TVBaVP!%x@0F@aCt*svNp@CfYcZrb29E%=@lbhJo|z(9Afx;`Q!RQ2q6PsW1wOle!wBD4EMs%^%zs+cd!{q~ZIX3qRM#mgH+Jyz^Cexq`FcgybU@zrOky$-XV4$7xRq!<Fl4%}=pUpJ%U6HT^=i$<>lzHYXYCy<^@cJSY6=G;}6F>HHMAMMp{y^yBJd@|r>Pu^e%Zc3WkaaykS<(myZ*^750@!rqquRb2+Tg)e;qQhY@ix*_c9NiXk$fCLjbEwOLcdr@k=vLBRbsj3x+lbAaaCEy&?9zCPtM}%Tv;I0jKbZJJ5RK!SHIy51o{w|A*qTQ0{FnASt=n=jS(IV^`rX?iIe5_)R^^fVBDWl_$Q~J}D|GH<Zea*W<Xv^&EmuCVnio)U^MnU}awxUEr8J^X=h^bNXZ(Hz7rO0#a@l@&uZ!8-xhy9WogO+O7x-f^?x^JAh2#g{-AEU@gJ(%OSu>A}ZN{QjPX)S^&|c-7FAr>|_r0fRZX4nM9qpHJ!Dl_*Q0?jRZh>IB-sk5Z!}7U|zjLo-;1c0v>h5cN6|qwJvhnwih4~|Lp53SK9Dinh(s7u&Jb0Jc%=qp5b`3M!aCO23w|RygBjK}8wjB>}wf<QGlUAoN+X@bKxye@u{r>+la1n2(g{BVaxNas0dO!XCtu<PwqBU45(30G+E`}wP+xYv@-8O-Xt+W0g=hdFZ_?HOb3}se_6OPzzix*WSYkYp5E5CEue%_y1K9SBN(6^vVOTBg53+Mg&uZykvQ+EsV{F!IDZ%+>kh_n_L;?&{0<LqU*=bMf%JXXTj+?~bmobVu>KCSi0f3_v2ESTfsQRkw#Shde47aJ0fi0Zew?g8LOyf4!wPJ74P*@&GcroWD?sq$YMtY}TVR$wC0Uz5j=OP^hs*R*Bsvi>RI5^>EydyIW@Ta!S)?SCz6{mSIF1K}^vi$Oybt!a{0xk8%Te=#@-KihP4v(@DE)egN(yuEs4;svEZ8wM9Fgj1D?j!8@ln_=YB?I!u2(8f3vP=*uOCtIdMr7+}yYoAs#rARM)lLamEXuqR_mR%RL5*}}N%cd1O$KI^*Q0toTE&9GlmyomiW&M2z^=f*IjQ%M5`7gTqgNqj?x815C5M=Lp&%aqjSMD@CX{WEsr(z&T#dzq4I_HyB#m(AXma9{n;VH*6O{0U>tuMAJ?+?C4z;7FcpS#7S($SaCZ@cDujjY8ke~TYHgZK4GuF2)e+`3o4F<+bjVfM>19fu<ITw0C)u_$rsbYXhwi<b5&cBWPD<ix><#V1UX1w2>Y$rjM;q=~+Af9EjqT%^qD{JXM()}`vwS3W}q`+>qcKU%zH8?5lA%f*I<cWme;SqG#dI``GZD`Ifz`ZlLCjW+uK@eX6e1Uybp*{c=FYG}VD8}!~>f0;)#AmwMxNYPpRT!)btCdh6-aB#T0^ICyebN8*ZG@{MAu&8JGe3VOo!}t%ID3RXO(D>+*9f#km5%nY1VonY{3k7xGZ55oNqc4|PY*6=qyHKR8Sz14;A5nlabu`Jm9}t?DB4PC4I>WoH%pCsB-EK!=!GO`}b5g=)OTVp?akAgm%Et=pIP6@V76@aE_ASh|F+Byz#7rLHwR@L^zm2VpnYM<nqy(}C_-HJXw1n#%D!p4ttDXwqt_^tXRi55497_?EH5+jt^_2ULh3Uy^mmO!g)^BOs+|jp=FX-&-U8zh?@%@>Y;#*I0W6`toU-Gnn14>D5+>FIF(>x<xawf8s@pPuzkJ(l1fAu!+WR?!J!lXr|l?!nDvj)xGbpl+XuMt^;8FvOdNP($>&o{L({>@$^x^|^0#-97vb{G1eid5cQ00SpRM!9ba2`l552}5>e{C2E4b%T~Thu>9ezvMvnJ|>`wsJA_x?=IgvKg-=i2oPLYY%k*D7G79OrK-N2^lUFh;w@>|!Pd^degjdz!P5h8wV0D>FFR=IVqZgfV3V7e64-4vx%7r{a$$MYCAErpiDxH;-q81Uzy(sd&^N!8Zla#u%-zj~!h)I^o@LoaLU-iy!!;7AbDutgFiGg{Y*1zz-Mi}ab8+&QK}yOi?%&2^+je+&`{4poWKSJAVMo|=Cx5|(zj=L|IPIO1;?tj;88q2`qd)nZl9xfsN)^F&!@GHOWqIJ~nQz?7=B`WHOb#+USD8|yn|-{(OGf%e_80fnF*k*G!+h?K8K>Iu`yMl<7gKWZ&GN4(r78S;_WgmK?afzTGPLo9pT*2tA``plYend)zM8!oWy!&4&K$G5{4LaL^yTQP{xX5(O0lu>=0b^lzw^emiq7Txea!*aeeJ!vQ`GKO_*<!+N72)E%J91;P<wRDh(|pZ%UCX{yt*^)?3;|U_4Nyy+f|pks_ormaFH^cmvgDtVY$EHWoYIS5Up(w(zPeq5u=GJjNyXi#Ez$T#@Dl_HSZrxN*0z}+x4y;rj{@3v1PbF@^X$8HOt+VD*VGq%zMoET)=Qf@I=U^t0B}uZ^o#*Y-GhBB(S7z`%n9%d*7w3_1?w`@f58&NMye9o_7khdv5RLWo&u3d3!v_#-Q^JW4rpB%f{zcDklbQ-5gx|f_?|a5MQoR2C!0-dvf1d>NkGfPaXAmQ?_{YWv@?fimCTqy-zP0ZqZow8uu@L3tBFh7q;!Mj}Wop`yFK^bT{P9<S6>nkW7c#@1>rEk{Xt`UWS%cJ)Q^Er4+{YB_0=fwv8%TQh5)=P38)#6b<p__QoSM=Wj*a`($ms$Qw1rzoGBvG<4@)EN!ao>Z+GoXy+a35qyKFO;X#K&x^{La1*^P<%vGFPg$d@^Ccx?Cp(PxhT<hjpF7*R0;(77y2KfHv^N}@CAO5+%Iq#WR{)@fsm55|uEDzT*{#!#-goV$NiDVpi~UzI-xs94??(4*CVLTHrX;=&(z}7)e^Q$`k;>asuRd3plIYbl=jc>nsF}iB$tctKxUNb}^%kSwR0|6`PpZh2tnVl4j_vU;U8yXoi9Z{ZJ6>+hP@@Gy8~E?NUFj;k&h?e)jSt}^sy?Uqs?(JZoA=zbLh`EY%qz@7S^N~Y27*~OWV-%dm^k;c>V4AYB`JS`ZK&NtQ!M`6<7Su1d_3v%t<g|vwY!%vO>^($o9=Y7G{08ndTIXHoY{1Oq34PbZ|2usOTEg(l)MbakyB;<xvN8H@X)2j@Q4K7E}iqj8YiMgb@_Eatroczywmt*|FHP6oqG4P!mCa*-@itXO8hDAuf?m~r6hX0FTbgC*iQI9kH*MG-R$5zXYbN)Yuii=2we{}N=(u?@4X+m{N}pDw!*g=az8(5oJz;rz@@JZ1)aGPYx&d*VIdMX)JGodObmK#4@^C(#OMbaZre=d4=#361Waq_g~cVt@MhG%YoLxwkr?w@ubb>@C#Uh594+45)6|o(J-ey<hUHw|>0MX5<(qbTGW=Wq>+0M*r{<YvMlH7ozE$@mq@6_9_7qTKZqhAnkHyv&yBKble64koB7J^vzUD=L-GyhK`~1U<mwWh(o3`aG`o~Ha?*EcJZ8KelbyJ^T3ZSr=J{sCT1W>-(u-}MHOpGC43eq|ewP`;Aj{i}pFSYnN^1GmI=Jcz`2EWCLq#kSfp7It$nfr!2J!)mmpS^<S0y^!cg&zs4FCZVZ|J799EQ^-*9FhrGAo-n_xBXhPE52|<PA_TvJn7~5nP(9{rw+~$c4*@hPva)5RT*EcR1dFt8^|P#c;}LE{+Hd?g=}wrTTfz1;EfuN;&V0c>GI+3dUDWZ%rj@J88B74VQu7D$oziu>R60J`8Rv{LZvR}+QCs<5yz7cGtKI22k&lw|MJO&q|~Lebng*S+f&20V`FSID%Eo>T{y%bD)r*eAujJ%GySh)z7>x}rH*d(KV_>ue~_fu7SH4}!gMar*!g|9bd+7k@A8+py25*7g&PI8>$3bUB@RZs?AC;P##`#vHVp6ExER)_vT)k&PF=sK-tpkm6}9JyEBgV9?|o(5n#eaVm+Ci5d2yGTH_MlcU;aic4+yng<d$~JP&HmL3`jgXBsx$Lf;;`2Td*MDt@x&e3%1Ym{LucZ`(2?p@_%?`3Ibk>Z(5RGepI7$%BT=2kbXmA8j@kjYb^2Jbc8)wt)#5ePI*}u|HVCQParGtjs>DU6-J-GoDQ^_Sw0XZ@d;;#)O*i`;_!*nG#?03X!zc(Gi3CaQ*dHHXi3G(tc#CvifY3*45ZXkN@<2f`>YHWUa3%7y2Q~p5Q2?{ElBmahaU;4grSlRpNr8Jg~kz<q@aWV<&uh9j0R**p149w7tiUxqAf_cBcM_yH@C<m-0kwB*NF?);6q|SOUXu`_{9)hM`FA(rBlo0g=_Rqx95B*otBGUfgw+aJPo9DBq|$Kr`gUn5ORzto%F9rYgmx<ctdc*i5Z+F8_}Rj0V6Q~mT*-3A+AeI%gSIZNE&zs4Cz=I;7!~!J`i@=*`9qO2uznJe<D1y1mcL$D}n{Jf(l`lq@8fwKSMK)#tnqKwz%w)3IjuGt^(eEKWeAV%lcm^ht##Yc^M0$Omu;^^s5@r((pg<UHUC0PcW{noyzdI(|HH!P~5c9w-WDMkM=GLlIhL`wfPe7Mhj4)aOe)`<LCt+rFOUk3oaf7&nlhPw=$5j%%yE0$l}fpNg_Vp>&+-t7&tywl+#!usyJGiOJ%mCXJueqrW|JJ64aEMOEvM?${?+%sbu59dEmCEr)y<^xn6q7F<4j$7?ZN@qHrHY)p`_NN{YeL#9Wm#IJp>)1T4WK<K0u(O^4mWcpzP8acapD-HLrTq~P*15~28lQjEx@^6uN9a;kKG(O6P}8xk)tea&nQWC~;FhK^Hd1C%!<niX6G+#iA3PG~TLPbWK^V3Bmlpn?rhHNWzW9`~`MT@aKKY}fh+_t7aBVrnM3)LN5?IXlvL;5a{5R0QFIcJv)hrp3ZvCIiRohrtZn$H4OfVx(DL^>L@8<!6WXUvxgprRwgrGGNMLKAt5it`>X6F<3sq6BNzicDg-qoRj;Fi6)c(YjFnLM|-0lOP6Yo<qM9%3KD7xF8A<OKyfO;DJ+*tuOJ^FH8Z3JW3-%@hp2T5!Uz`OLKm|{pXEIF0}PHTzRjiLD;z7$r4rRH0%7lO&4Dg_+SKftOp!Y3Rav42IR<pNk5^qLONPuPro#ze@a<N#xQ}h^>tK{V7u@u|GX!^vw2y=FuXZ53TymaYRdk^#fQ;ODR^etKr7R%@NL`!0a@jE$Q=tiVcgUz|X)=uyHNeL)4*|iQ(-1BgO9T!=13*{71h*^hmD4sD)qjQa7>A?5IO1YrDggha&l5l-7B-d)2_u25Yl|43CnTWBRFIEoyJHO;%$6aMHjG^?O6W(F?*fDuzrpUron~IgV77K6APWoE(PX+c47e9x>5v;Zp6_59jFW(zu22qwK#L-2Yrr+~#O<U^rpu;qfxJC3jPS*tP-p4#2x2Pzr3;mleNh(VYbk^cOSVcP5E@4izIfSAW{IAy%m8Z|ML=rEm01wAt1E#8(0^RGNU!lB@x&S2$9}^5{<m*R^Kz;7-!dy?i9S$If%x!$@q9zUrKD8I6@sViAutI)0T9e`(SbVrXPm%&!fIf*vuz>x({uVen`1De+Av^{*(ajO^jrYR*iIbCrFV#GAm|zKTzUIaji=~k`(yB5Eg#r6wit629N?er3~0P=chDF(9?EqTOvG73e0%G<-U4pXS&9S47aZKReD@%_k3$VQ&^iY(=hD6cw=fB4oq^*$mqY7wsg~~W>45ff5M=u=3+O?IB9ig7M4j$%2%xuKR6}}~cYuWs66n#8%@|W8&#BFf!TlPD{zs=7^}#q_&dX5rwGD4&iRN;NDFTL8neT-_&k22?1mGb3k3)nJtE&N(6?rgmXrZ{#eXxJ?*1&O0@oR8JXS5oRj9AIA(TwiU%amNI87?hFm(RUOFyzrU7)=JM@njTpAr%1oj`_QkBH@FDO9WD+&l6_XfC~=kD=cc?z@FQNfVH?BQfgvCxJnJ2(m-}VF4P;jtfo(?P=FiMcpQU~taXJJF=hf?fX?<cglHUuN0jz+2nE*ZEwH?`6qqhw4t)WMj&u3~VkWhaeDO?t2rhh#gzh!b8{oE6kZ5|tP>%F3lb7UD$t-GFt&HN4Zg3lcEXM&9&<8P?_ButEpAS8zAQ!D{;q$$)3NMrOSX*G~BL*pkH*@E64Aw{ph#*||WfKI~7PX6j!w!%l@P!xyZdPY1Y@8ClGM&Kf7%ZK5s=R<o6w33M&ryI`4guhYm<|$V=3$EKMJA34E}u0HYe_17M34NLJP5<$PSDAFV5(d)1ZUW;duQNyGMB!bCR5D|9ve+2$|0!R+0dM!o*acxE`UI2zM>Bw{gr#;^y-q+K$D}>1yB_@6G6`}%(fQb@=5W`7_M(D-jl9=M5n;lqDB-mv}A>gQt20d9t3w$Jd$|N#!fL~nSPt%QPtK^2-!z}6OoJy&*D`nKi2r;9!6s^b7e!EScAa@S~Blpv(O7A`1{Oq7Cy!yAC{JfFHtP=S;8`ofPH#-3m=h3Sj>_QkDSHkOOX?Q;}6cs(~Q(&*-9{f!QpARQ$+cYSjfmeVPGD7p#;-8FUh{tH5&tbqR%VRjF<+ql}P=|R<bkaNcNBz%J?@v;_Tn}AZAsXmE8#7GDX3H+WgrfMCN@^b_ImU07qw7Ee#+n$ckdI$O2o^K{Jxx152I8y}14e$lVrr^kGR17-<7TM%egU-lCFU-eNQHB}mzUgIQXI0WwZuGVd5$u*Meqpcv7a2FOms3T2xzC9(nOHz2)9!R{Ek2OlOuTwpv~30?{~a)J_~VA@l*k_BL+4{SEru(^VDXK&Gr>^)`+92@(2g*}5pfXsW+8oM>D1hfpGO%D+B10z-?8qEmiPk=z{AMN+3fvY`mHGp*%mLsL=SO#@I#o|8ZY50Swwa8gU_9Y)+aT?Glwub!#P?-y?`U|M(DN(p{@{Lkg$WS<fBnZ=lr3+eT7T%y42}lKq#etL$NLeURZZ@Eo8#^|4kk1}FyfL2>jtx@mq#2P0cVPYjIsu>yq*NtLoYq5)q_@zl$Xt_CDBLiGZ8Ko(0E-t?NfS`0`PM=+!qP@FLh7Jd32C|h2pfa}+w!HsuG&lxD;0w6NnoU{Mvc@au}zuRg5;pirvp(RmYyKGBCO8C-f4S^#cq4-`$=#{@N+=<7^vX{hhQZWc*{{n-eMT69s;pU0AdR)as+ux?3QyVTgg}xjk~hwb!E^}0&dEKrp9nvA0XftB=a`6p;(mZ0wlsgB{CpDJ;EB1yn)IMDC%vn4<ep{?No4b5;iZw)ip+T8N^i?w`jKAdO<9wkb=MbiT}{K5u)Hq=3NiQrvqDJI%u39y_Kbx)=kqBg$>f^eENcfyLbkbNdZcVS*wh1Orx*-QC$p}MsouAq81Rq;Cs_#xP2V_?*)u6!@3vp!8Ir(8wALbiqTnmJ6N_1riaASjI`we9m(LVh!0>2#NrOEJgwN@cy6#k0|g+(2q;`@vc%?II?F!628ixI2BR*@H|j>gZxpC*0^C&*+{3`aZ;b5wB7aUT$12a|VYkdU;Jl6!HTkOn4C_F`68v7lAm3<D2N#Hdf-o#82tj*r+8g*S24Y;B0fNUDvh<8&z!Fig<o172d=3diM%v1N!hgd*EJ38Yia~<K1L;n|c}VEx!?=A^5k&r$y<`U>SWFIho(G;X?I8WAd}E~%Vwf2CFsK_sDuZq6Z8OcvD49HA^1W{C#<G_#MApBDyCc$x7vAYXkYs$InT#R>_>zGcgRp}CYQxiP65c=u)D~8#@qCMZm^-*(gWZ}y^0*sxWI2pb;zPEn6C9xaN%_WEN6I!rou8(>LZK*ZOACc;0mET?>{gv3Tq3|F5rE<qK;HoMO$c%5ZxDw;l5YJX)QUzhfb+jtl!e`8uwl}UVzEvY@}m}v33vh?WCsdgpeO@|XJEZK8}}YH5)cPRmyw)<qO|D)`*;vm3DM&Q9QNT9BP}0S;Z|@5tdC|(p#ztC0GC9dya}>8V95fd*$0{xX?e)xIxjOti_K6<lt#}9_Q{8k4jGM*F$ic$;C&z2JeBWC7Mn=)X~FtRiCVsnq+JAv-2ufnEmd}W9zr=<>U!D=$?J2LeV_Ll=*9#RrJ+XRh>TNJ0AV6TfUtby9^c`z@WF&|xN>-*OYkgUjS>(*Es{!Pd&q>!+(kkNmN1ZzdDDSd8<rD_g`%-Qkpv5J6@LX-T$X1SW6y{c<Zwq%jmd#RdnZ6%AP9zf<_Zv3LPYE(2T(u*LW=aKr;VUt3uW7L@X3A~%?gz+(2AXf>^YSIVb}rR?2({!i3-Oq@4ywACh$faL?z}qg1fxG7<=H?P{76QO)kaaM9<R^U>E>-Q4E!?HW&$Cq*Ty@%2B{9Q&?eF$`Zb;BVPpn)Mqo`X{rvchIW8tFZWs6_ox;AuZ;hB1`6aJO1^QEAjsj#o~0*+^t*E)`ENXuRtM*SKN+xe2bO5K6AElkUj&1wp#igYLV$l*`Ww#u4>R^5u@-_54Ppb4V!{Aei$<_bm7Rd<3&kMN_958iby%}1fylMvumbBKMbL?IWgJ3^0f6=dUUvW0To5N6lI=427!p%TQ<+^e-=z^s8<GT^;4?9ZplJL5>KA0aR0xQb{NrMlu0!qag<#d7sNzoo=fD26)kz~Eg__aHS4d5Z15{9xyq}(KxGCtMkfvF(gOZ=BSf0{~Mf?}~pZ}0VNn^{RwNv?`)QA@cCrE)40>B{rBe-%^UWgN-ffE8g2HZek2HZ5k4m8+7&Pa<#{b@rO*s4Ve9}&qVAohW3?g+8LtqvQLLLA=c5{$6C7QkPB3B+EW!tLEkg<$DH+=k@XVR!IBnhPh~;0BlI(?EhG15o_7NTxmg09yOPnJ07(Iy;rVjsE^Can-1m=MN!ZUSVgIb}P=8>BWAC!p>4sh5_gqtw>o4(?#+F!vo-XQ_5ch4JPdoTg4~@I6Tm$OseD9Ejy${e3hh)Fe2T7PqeVu0143^nw2yfN>qJd^I?eIfc+z&!7;?rYatI@6>55*RirmS2R{l~^f$hYkv)(Xy1|Z12-e;PA*(zKd0S8Nq1I8@{Uihhms(I^H~$~tG|U+HKDL}B_6q7|B?o|#Bh=`LF4++YL29cu<X$Ht)fEaI6~N&I(G<mwgnApOa2s~$7}@LcU_`>R0di0*e58SE^`8-CWgI)Xq5T*1L?=M7MF>ot+G#y3ex}e(rBVSiCM1QT*y@;2_1kSvKSwFJ$ojuv|5Fss!lICGEUrh|Lohh>DB~13n*{MlYJn1kT^6uanNrdcW3MAeGJC-aCLL{2kaw^I<L7<^WOqy?GGE2Bk?Ox?LHiK{?eL(w50o>J@CRVy0VLB7z5IW!DA~Cr-{=-2q_Ddx0Uzprs33IMphTGC0>YrAAu}FrRqV(g;e-w2iy*ECDWg4*GWr6IZaXPA&zu-n`2nSt3#7$UBF<Guy3jWSmRBHM`Ro)v_5~^V4WNGB3aWCWvELz?GZOAW5}eyf|F8e3TYMpk=v%|An@Ili6dR8(@x)_}$7Cw2aeu`rRJ)RR9@0=4uU;Ut5p1QUz`kqEIr{G8{N;CHSfN+%6pqLK+sfX`9@+8Y%W-V(`+p@D$;hbEI!S)Tlgs1A>uZtcchR$f`T4&$-{#NXANDvfYQ81f%p>)?aW7iRCMJMkaVShOU7giOJ&Ials@1mTAZ?o!-78QPgOa+nWXmz6niYTl*?5DB=&dC?j`Np%gtRE*mj$$_<E1E6B_+e|Kf3Q`&oOkOuQn=Hhf`%!Pst<wA4$3D$x9rH)st2neQ=TzYXB#gl%6iB!HSB!Ky(v=YZhd4fx%A;UeRS^SkNjy$IvR9j!LxY7l_4zkM7sEs}#{?@0@`PL9}r`_i5)E=gH>G+9>+=gwT2FPnVL<ws}3eFWaM%7ng;w;6m$x5O!dY4dOGcIfhU4?NI_x{~K!A7*=#F+^LFegfn}=IAE30h6un&qF*b8Q};<np|W=bl?s4JnNhC#4d|y~$<cqJPdWvajbR5i;y1FQ;WQLZ&s!k|ONYS8KcKh-oKk?EUn3K)l&WkBz(=-7gY-s8RRBl!14W<dA6o*I)Dp2~QMB0@8n|&?$qG!}Jk({Wg`$s`jLOD8j@7!DrT+>+jTj2w8PH+sT0r&$Fp~z!7=cIkeK-|<IpPIr=g8*x0K%nDa5oHS(Vz-B$Toqs0rVsaRPDKovFeCT6_FfZ_?SQ(TuO>W{3F4ZrGN9RTy+vEn@Ny%fo#sTi=r>R0alYrQTz=~6(8;!3dI|&O6=+XGo{joqhA#a!GouKJmFMHHJdJ5Djt<B6%6ap|2|jX>?Hb$x>{5M7y@jYfn_JGMwKkMDhS7brVkpFB>Nv8QW>cHcnA?6W;o%2brep|DxCzwdmm%X3Y%0w&RB~|0We^NV^cVmjQlRi1xhK?u=|OqJzYu##4ngOAVPL}P>*fE#AN_$(vEDdP7(WKaKeV8FKqBcpDCCbka!rXNNin!)d65716YKJNCmjYFMz-y)1&e>{uXByfaeK*g;U|fQ}awUV1N<6(a66PPXW|!*Wvp;N;VZAD&QriL<g~}1_IS>74FjkXY#Sf7l_8-J8eKa-}o`soEN?%Lx}Su2@pxsn;&IOHWzIPGW(S&`f9=N7%}vej|i~K0|v;wfJiKFL#`dW9}WZGe30z1fy)qqJ90qA8j1CEA3`fUj{pbOCZSe3G|+Qb{4w1WeYb(W9|SrHKf149coTGug-aX|fR=DE5%`y#0OMBR!)eed2H5feW=n|6AS!XNUwRlY0pJM|(F;t@2X_2Gn+YoKKLT#DK!oTuX-hU&1V))5fFFJUF17!nkbwVV&tKp@ZTS5F)^WH+4^hYjIUV5Ra^vaJ0_@a-Z3l2|kMTbhqav~25Qm>c!to+}a7R=Hsu(M>Io6L9ebNaaKmZsA!QswXE?q$BBG4Rz6^F_;hA7~KH4GpZf%8oxK;veW8;zTkh(*3|sSGIJfKfqU{5~YajyO66{Qm0D?)nRmZl?jgAV{>@Oq9EwENDgz*9zg9F_<kT{Kp+;@`%}13ePRuf$}k`Hy=RivFCuOla2u$>EYfjxYyRjL0d~e%$SBH&xo3h1;WW5$m2}NV}3A&4VDIwx`K)>N8k%5e7Oe8JMw~Q2Sr~Lh%Ez+h2eKR{H8mB<T{d8jm1g86k$#UXA7X3vLJgjBYbuO%!UzTLQuW83lu31Q(=z@Doi6k;z8a2GRpiC&;$Xv`>BUesBEGRtFk$O7z7cu#|2w0aN#@(iATn;gasxR#Q7Y0MQ-=W<|aO=yfx{Y!Ft!G0->MM$!Q@W<wg`ExEh}tt5T)ZiDY}#U!AcERX^H6#4)hzV&wPsMEU3o#8Zr1iQJ*%6LfQCP&xOY8f?Zx)mBZonZT^-h19RWN3l1m6xsmL<G>OWgc9d5{S;m5VfYjs=D`&WSICrvrX`t_pDvXi28-4e{nq!^718SK(`q!z1s)Q?0IA!dRf>@|?GoG3-`hujMgN2RxIo<QY794XfsWz9T7%Y;I6V<-AR$dek;XlhwbE_cxxNB5{P?HcVFaj05f{-TN~l{+-?vt#omQ{}!S|J(y2_%f)XUd=Shx~}-Av;Ld!eW&pz@)Jod7-QOVEUEe6&q_TNUujD*#qhjEBKn3WcV$U7`$j))`e3JndLi6XAzkwF}Z)+fS56-?e{MJyiGVx$_)U#(d;gLA-**?LGk0M+wQJ@9hq8h=Os^3GgHKOfBKmAyd^Sz|<a?_8(#SgJx0XzckrWfu4|lT-vE&KL+`Tku=#DBvHpsK;=qrfr55^>?!PB0$}&4pa4ulDzTQyK*>X#y3=s?Mq{laL>Q+adms+Uq3qk(_p(QU#R*u(pphN8p~a{R$s~xvWm^UR!%FoWm7N9=DrT=>qS*vhpfZLgd*?LJPa@?Q85YD4wh(wRmVc_L;bAps^rCwOdLThMF@DRcH$NRhS^7EBKw(jVQ0o7BjQKDc^nsI|0Qgq<Kep?@%IPes{sc(xK`JTS!(2sIc^kR#_~DSt=a9+-na1)F`#vii?h~p34Ovhn6AGJ5J67Bdeop{JZ6cI#)0RIQW{pUf!a)9R_D5occNkIj8^Y{Ml8xB+{M5j5Eak9MPwi7iVo7}eb$2Y%Jz;?uJVIog2J(JOK1On~Q4(eU3^2<?5;7y!M2bp^9#VZu|0Yro<&_#)tQboP+Y_Zf1~03YYk#ut%_n|P$w|*+i7+EgLTMm}%bRR~{6&b-Mj}4|Y7ARDNYyyoc0bN(7SocYkAbeUa|vW)5<v;XUYKk)HvuM2Ags6i|5XD)z%K^r8GDgf^=E(^H<*Ku#O^Eu+hPcfz;xIICv18ErEM1nkTyjknO%A~m;p#1u;T323cFKKP5!^i`0eqZ+2|a4iZ2Z@yZ${mC&nH^twW{AbS4(k44Je9z;16CpnRaO;Gd%0E5$&HKP+mHk$_rBgH|90V0lygDT$&$dK|4%36)y|siHct{(+SP<WYaRg?r?mrtG3*Mbdf>P@x(BE0-1u%&}1%FhW3&GQADu-3(fs4D`jlQ|MA}!#i+!QZUXj`Pjw7VMhkq(Vhq>Ig7NGH<1biTRBK6RwO6D$ve_YP(TPxim<nY#4d2Hje_VQe!@POAcK4L;GJP;2F11<&`H!_#DXFABpjRsji>)01oaY1O*#kRwK4FyjG7dNpp@-Wc?pvb*Ns0{IM90dNS@fuMSw2@>5);Wl|4Rqq#>PD6)dMqRlVYeL)u!5Wus$q`RgowDQK4X$XFe`03Xx~^271^v|Y9i2uTuRU&3@_2l@JLDi&9qM~8W{n8Wp^NE^vE+|9kd+|N+jg250Hc$D}AweI*q=a-`tAn0SEuq*meB`4m5Q>7B}Bj?Zt_hB}r0`CB8;9&@pDauF84w<#n+f-hfMyE8-<B}Zudc*t*ZGqrKWFukvS>BJqW<mBPnhup5)6x_u&y?sV-V%0jjymMHZqxx14-lY(V-;Yy6Hyv);??fWuZ3A60LJ4Tb|knT!iQ^z4+ROOMn)tA>H)li*2DQ6b2yKZd|=mH&<d<S56<3?JDe5mk>*$)VG0}t!ReuAQJeHgQan9;+K@*gZ;nX-Tjqnx%Xlr{FOCUGEa?jE^6F5weFU@2IG=}`k)(jEEuke|GLE~4)hqk6YM$xP^Dr}#of12#efHKbM{dS2uecu^x~wyEDmmBk`eRM-jgoY=1jPF|B&1}|hTXTqExZwiiUWgn?K5zfxMak@!eiJ;Z$V_^3F2_03Mu!5V{Ive8B{-1vf_2{3COlG#8->3){kr*)dJ8d43Nve7SnU+cm>Wpb)o6lfM~EZ;mvOet+$W~p#sRmi({y0x*N((ppw?KoNF}V^^RJQNF|`<sQ=g=%35%&3a1|a?lro@oYMz7E*I!++5~0@kRBi<eNf4x?ag=TK{^&4Y1<JR(IbF%USuf+q8J%GtRZ;qV4UE5B?045hf0B|TV@#2Tk}?L2`dYwf0yjd_-p2njb@hg5f~#(;}C)?5RZ)hm;7*TNIWKnT1seL)~NPSz$ob^B(kL6?aB3MbY$oUHJQ3pvaS`i0cgJtHLX%VIUS}BJ(4ax%jB2if<TtEV%wj$$R-i>_^yVg2Zwe>(D%a^5kWg4>snt%)_3GJvUB_}nUKe3TX`DgcS!&2&r9-8Bg~>;?$d-R3hLZ`6hudu_t<0Loqt$see_ygUec}aQ&vGKu>uVf(erzZs|K~Q@~rur_N|J=-n$u(u~HPBYzog`i$&06Gr6fl`rfw_hAKKLj5NIrb?gK7zoDuH%Cb#uJN8rj_gqc80lDWS42@hjjTT;O$QUOKg^XK_jcjfPf|~mhwDMu7J9R=~G%Fpap{yW}2cNT$e+aQQ5StU8K?~kc04~9Bg<puh`@WUJwJzj=2d!(TQwh2fC(=gIa2$(FfwwL|MQ_4x1tz21-B3!6=~av<pBZ>V>^oj#Q`s~_>a`T8%MG&d-zZQThdlyX47?oOm+!)E7!xgfHyU>NkUrH9`p`hBs1r}3$;SVSawn3Zr?AdPL8XAmKTj!hWZE9Mb+R{~*H&SiJPx%|fRuENVNS@vMx>}hL_@*FBXV!Ti3-vzo6p`rreiFg3F-QftY)IAFxDLZ^Mv=|LQh?B2HGQ#XuMYNT6}++13h(32)3#tu}*=II>>uVDUHUR{0MB4kc1TdV{eZd6oZUU*ez3}k0Vq3G4zy~UnJJe-3Z)ihfK=)z#s;yjT?|ofRd&#SzLJn-48m{CX9<qnvqz}e-TPkFmVl*lpuR|Gyv(^qVkr`J=Eav&D<Dpfl+gLLl1=e!G`|-;P~|4wEPMN+J;9^cF4iX(|{u%2Y`C&EHa2Zx<4yK>m=6Btxzl)igI6)Ku=AuM`EQKquBxPR^T9vRLMv%a}s&FB5zFr_6j_F&SykT#zF-i?ZJ*LLAWK;f}(rKpCphfZ?7;e2mLq=%&W9exaJ!RPtYE}$5_0xkd|ZiKeYtU!^g7*(4MzYFyTZVc!=4@k%yg<0_Wj75&B0uJc9Pf{=)<5Q`X3zTL1!9cv49t!yWS2yMPQ*$e%~VkTC#qY|2mM@DCr2>yC$yJ|qsGE-{1CMbrNK>qI)ry@KMu*C&Tk;|d>qzKWg_`|5Rq3%3)J1ZJlkPCZC-sEp(w5S4Fk`-><Ek&eH94ec7nmDL99R>ninQj<MU-&$cj6X_;iz;6&qF2oPW0N4zT7?1@OrIMj2!e9fZ5Yw|6!g2Eo<AM<=_ZFT*1*S6gkPs43Y7~BZ7MYF60lrO$jwP68SuBu0U=fjNj2C#N!FWuBw>BP$R7v!dgzRC<p@Y!dwp6$_8;V-r$Ag|q0_@#=kV$p#s3G?lLAmpcsLlIUe`b?_$EbsSyfw?H%hwu-wTgL#v0wYbVz{W$63a&FXOk6?hO%eFBc9CEy2d5xS5o2L`^{D8-#q@7pCP~?)uHe&rQYj%XI^Fh{`5I?^!j>NI=RamKgE?m-ic-D{T&w8(o<dEY_djn3yOU?1by(yOy8pJlXt}iSV}B))#yccebO^fPxBfw>BdYa@hGRi9ZC{OQ@Y*MXF_D4FKZmv<<A-XbiApve7>pA*@%1QbqX!Lb!E;VJy&<xyx|2i!7%d9*Ep-x)Xj=Vl^Or6i;qiXGO9msF0INoV;1NMDSkFH^ZKV-s#kTD8>3coZ^hTnvaHl9{SHrI?)!>1W|XFyL#8RIB*KIwqxBi{x#FqPEtMWNx~4$}l64Jg3{zOa<0G4Tsv*m(=}Q@-8y&u9=I>=)bXD((4$a;>71G4jc87H(!aMq^!GMFhzX$^by(cXQhR(km^gAVIe$&`Z|GRBRvDRoZdeSLR;-y|km+l0nvUF>qyvBpEV7`c+;phyT+bipM7r(LeFQ+3>l~l%~t{Im_(KUtJpH*t!|K@eMb;rlhwU4^P-EAmP!tH@}kqKG8dgaXDg}2Xp&F33dE)M0UIW`TXzB2y!e0-=*6c?o>EcMvXCS&Q8#n++Uy*)*>&>I_KUq$J5V!)i_`|?3%MbGrc&J-tkck)fJHYaU$PAnX#-dsu9n<Oac-5R)Rl^>hLtSYn?w;38OHB}})#Jy=2cu+SJ`?0q6KudKmc)s1WA6L&{%^Y@&vO`p~qgLad3CSuM6IA{lb3wqOx#I616JIC}sM-^Z%p`=zcFJOot#`OLaKATVt-Halce>uh<<q6#5ozmFioAI<<>_L+m-MS40({q9SBBe87To0A5Q!O?_i{v6h=t~$m=^7;(Rw_({aBI8r?KyUH@V*ux9URSJWLKKy*r4<gjw7?=h`*@Nel9G_l~GaF%EXcS7)8M?$kA8$s5y|5?Hv%OXKK^8{*%b>TdE*jT-q9Z+!n}3%+>pnpIZ^dt`dWysJ-s{kU;qi3!WKjB6)vN*Z*(H8LK`x|$#OZX>5yhH9o-PauFch1?O>xGPXl)n!tmBG3K8w`{trZfE%ZZ6)(NkycLX=XAL*&19wC--#F78)YC8<qBt_R~<!sE)$}TMli06{_R%z>D}vT@dw57(|yc?oU_Bc41?ScL@JXXa2Hg`CwcBp&$}4u;Xb`1C61X%oEPxH;#$vW7nm=EvqUkwOQkLmwNo#Jck$PHWlL#w`K5as6zQc~Z1=ycZ8(KvXv3TuNSba{Tvy>P2@XAh(~l0Bj5jYz`nH(b?Pt5}qO^TSv}Y5bb!-gE%W@wrG~SyDsgTUh4YgfsuGAq_zSVba^RVh_ElHyHnoTX;Tt6n_BVgpIXp+uwX`*N(xMt9iwe;(60x>X6SosO=V~nEl5PPMbSwF+|v_Z?cjV1F9_Qm76g>uW~pFDhSJM-XOr>NXCU2w+=`sZWrg;&<PPhVzzo+eg%`^t~uK0jVo6ArSo5j~T5n?^mf^&?cJ)9;<!5@$^Dw`3+64ABF(nr_U^5LHcht5Zx&vRx3}*YFLxrhm)vRIHe*TxffqL`SA^?|ajTQ>CU(Z5|2FjB8?Cd7?9u%fH)Ep^GjWjXP#srk*vSPE5X<@T#EH`Bex*9<8i{jzM>IZ^qdqaxv$aUr(l&qO%E+l{Fq#tgL4S#*0?G4^GcGHceTah?`j1Z@X>FwAd2&GC069xsr_NVN&?hy4Gk}e9)XEXw}vKwc~W%vVG05<s{<QhPRp@uf?m2Xt@2ZF{)Ai)Z~d@m)bK_ochtgKNj-tO!agkd5qewktOxUWU2TTro$L5XqEh|woSoZMCj64_m)yOkpvgl@VXM_;TVe0c2RNm#iaNzmy3<LyA}%P6I=$emI%MfeSQrVR@Wy4U7rgVWu@>&5v}aZPR*v<cqJ#yoc?N}HT;6y$+=kW{4}Yrdb;tKuhb|99l12l!*S!+#-?g?S6gN)wos|@=9#HtQu4Ronhz?UUmXa)xBAj0!C~92baBbZXab`u^(g$^IB}r8;<wXp+p&T*v#N_7OBUa?_+JjZlV(=pVF_zs9BVeUIu{{PZX*%i852N|x@*>P^K&Bc;YX>7-w8R7hT7fbtHRr5&w5U`h6pb#i7nu=1%`jmZ4UL7)t-4}9L?mYde0<nW21Tj*Rc8%CD*}iKhvvs$Mc8`!;mv$oei6ex{G1-t0SJ3^*68qYpvdESgLnjtIg;~1wJ%OZb5ikAB!bkuZfbqj)-Pl&fO74`r1sl47#8f+s0HuszP<9{P^!?4xjmIF0uI3oUz~k%y0Y63D>ze$S@RM?b&ivWHwsWQABK#Q0`jn_hc)rYkAL4w|0<ftP5Rn&Y>+f*P4F)39hxk)z@uOkC-eH^W-XbzVKkJQS6Ytwha|-ykMhY*=ynGzEs3YcQY<cxnMNy7M*_omT*{_`P<4-OLWE8*Kg&QNIU1+!>YzLE-fwLjyvKC-r{U|=kIsAeHvzVj+mq<BvI;g#hFL8&vT2^KT}*6yTfur@8*}}{7NUn$4}KP2QFWkS{;Lm$&6!GNHeIL%2twb&z9r2vu8LCsC3XNB2MKE9^=Mulk}l(jpZjEoyn<tadz}mr0Ww!hL7P!z3U|0_IH*wM{|RSxBCAqbHCnx9T>>#mYrLa!1!&j{pY>+SCUI5hGT>pUb+c%P)=gr#S$(FEbO1VQ+&~~HO2Vl@lLA!EbP%LRS<7%Dth%2bE%yb-pu>_6ICi(AF@Edh6oOa1`}S>4700F6{(=$Z7b1BXorSX@183^1EU!E?4u-ao@-ZKmL6yyid;D`@?Cy12CXxASGDl3YU_7V4PmA;$)VjMw9CJa;U4_7H+Q>4)IK>xJ<H61OMGK|YoX&T-n46_u*5)#>Rq{RuQB^3wd}d(=XyJJ=epj77_lBV!N%woGN+C0CDy;lZ1{A*{G0!bSkKGf!OPR+<9oGDsn)yo>g!#YpAUJfTiDlAU2+Gbt;3gExVJE81|^O$g$jF<3+ac_amH?|8h9G7^-j!+%#*hFUSz%O_nJpp+1yi}SXDZ?W@mmUV#>maSeW>6$44Z&&Fm$2gM91P;@#l3_=$}&UMHfb(51@1e~7*{UmNQBy1W`}xLzmj%o7^)VV-I8C)NFW*V9Mm0$;K6<&7oVL^N#MMCJQmEw9hDn@)}okxd$*a#lt13;M7aZJO}z^?ZKKmT>(M-<6uX`Co@+?pa$mhoWmw&(`^WPTkwG*eyOzS61#&QYpIJLhiDb&{l6mP~dUleONBmAox|q)ti`W=Izp`f9Yxhy3F^sKKDl~!35*xY3EWj$Y3Fyb_t82+gj%PsPRoh{YCK5uVMNs0>jc(!RJcMv4zjClNU<7saPZyZ*-M0iQMYnnVH&;ntLH4`z5&4*V-z;m2U;(sJbrmG$`|evUhlhM#$Bs94fT#zr>xVQJYGQZH`jTH^>W9I>^5{wwHdj5NR;K?fPu-K=AItpoKGE#(+SBqe$kRv|GDXZeN2dd`l`>gCb5796y_<PE7t#zKtHl)K@xW|0WwBzN$5pGiv|lYnQQ&S&&9U>lbCaB!iy;kLtJT7+K0^8ae#C%v!v@R(!Rw+S%_jk-XbAU-i|AUfw*cJ_S2ie~t?u$}{|gPNCM#aQOs-+g3tz!@C)jlgz+XEmARcUeqs{TQ?hyMZBFnGLdmc{j;%dbk8}ZxAje2xLBLJh0+z4*}ta-p404yeP<-YcVz_+HG2NAaF+CM&pyY@M6I`MvB}GHX`yzdaQ3sDQ<lV6rwy4C%g(l)@^(LiJbetTyHdt@Q_FJ<D_p<tlPbby)|{xLSsZR+8sBwx8|o>fOQ?==%`j)MPNc;18dv!Hny~6ISB<BxE1xZk*g2^2oxRPBpY~;nOcUFvap?cuGwL$Y=-JIUEW5Fo*Z+Ixjrww?qzmEKoOaHpn`prAU#k74FN2`8IS?Yb_WJE_E$llrQ*QR`?>|&r>&i+$?NQj6wN0*=em6Fy(kAf!hq!Gfz7(I&?_Oz`T$O5DTr@0;w^2>yPfho-Qyxn_INI+-8EQlPzyH4i(_csb`rp6*1Kd{s6*Z0k00',
      bai: 'ABzY800000008aWu?d3!5QfoTAz<SI4v;-!r{ESg7A_MUPj^ufA*4?cc(3{3?q<05)fLY=DU%FMQXE~@X+Dy1yV}36{rCL5{q(2;0000000000000000002|f%}I50000000000000000000000000000000Kl*9fc17ssHp$|'
    }
  };
  api = new ApiClient(reportData);
});

test('getMeta', async () => {
  const metadata = await api.getMeta();
  expect(metadata).toEqual(
    expect.objectContaining({
      app: {
        name: 'vcf-report',
        version: '0.0.1',
        args: '-i test.vcf -d'
      },
      htsFile: {
        htsFormat: 'VCF',
        uri: 'file://file0.vcf.gz',
        genomeAssembly: 'GRCh38'
      },
      records: {
        info: expect.any(Object),
        format: expect.any(Object)
      }
    })
  );
});

test('get - all samples', async () => {
  const samples = await api.getSamples();
  expect(samples).toEqual({
    items: [{ name: 'Patient' }, { name: 'Mother' }, { name: 'Father' }],
    page: { number: 0, size: 10, totalElements: 3 },
    total: 3
  });
});

test('get - all records', async () => {
  const records = await api.getRecords();
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 2
  });
});

test('get - page of records', async () => {
  const params: Params = {
    page: 1,
    size: 1
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 1, size: 1, totalElements: 2 },
    total: 2
  });
});

test('get - one record', async () => {
  const params: Params = {
    query: {
      selector: ['p'],
      operator: '==',
      args: 10042538
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - one record array', async () => {
  const params: Params = {
    query: {
      selector: ['a', 0],
      operator: '==',
      args: 'T'
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - one record with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: '==',
      args: 10042538
    }
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - records with greater than query', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_number2'],
      operator: '>',
      args: 0
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - records with greater than or equal query', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_number2'],
      operator: '>=',
      args: 1
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - records with less than query', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_number2'],
      operator: '<',
      args: 1
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - records with less than or equal query', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_number2'],
      operator: '<=',
      args: 1
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 2
  });
});

test('get - records with less than or equal query invalid field', async () => {
  const params: Params = {
    query: {
      selector: ['n', 'n_string0'],
      operator: '<=',
      args: 1
    }
  };
  await expect(api.getRecords(params)).rejects.toThrow("value 'a' is of type 'string' instead of 'number'");
});

test('get - one record with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: '==',
      args: 10042538
    }
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - one record with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: '==',
      args: 10042538
    }
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - one record with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: '==',
      args: 10042538
    }
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - one record using composed and query', async () => {
  const params: Params = {
    query: {
      operator: 'and',
      args: [
        {
          selector: 'c',
          operator: '==',
          args: '1'
        },
        {
          selector: 'p',
          operator: '==',
          args: 10042538
        }
      ]
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - all records sorted on n.n_bool0', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool0'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool1', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool1'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool2', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool2'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool3', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool3'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_bool4', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool4'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool5', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool5'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_bool6', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool6'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_bool7', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool7'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_bool8', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_bool8'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_number0', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_number0'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_number1', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_number1'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_number2', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_number2'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_string0', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string0'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_string1', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string1'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_string2', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string2'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted on n.n_string3', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string3'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_string4', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_string4'] }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted on n.n_array0 throws an error', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_array0'] }
  };
  // note: [] is an object
  await expect(api.getRecords(params)).rejects.toThrow(
    "can't compare values of type 'object'. consider providing a custom compare function."
  );
});

test('get - all records sorted on n.n_object0 throws an error', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_object0'] }
  };
  await expect(api.getRecords(params)).rejects.toThrow(
    "can't compare values of type 'object'. consider providing a custom compare function."
  );
});

test('get - all records sorted on n.n_array0 throws an error for invalid path', async () => {
  const params: Params = {
    sort: { property: ['n', 'n_array0', 'invalid'] }
  };
  await expect(api.getRecords(params)).rejects.toThrow('invalid path n,n_array0,invalid');
});

test('get - all records sorted ascending on position implicitly', async () => {
  const params: Params = {
    sort: { property: 'p' }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted ascending on position', async () => {
  const params: Params = {
    sort: { property: 'p', compare: 'asc' }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted descending on position', async () => {
  const params: Params = {
    sort: { property: 'p', compare: 'desc' }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted ascending on reference', async () => {
  const params: Params = {
    sort: { property: 'r', compare: 'asc' }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - all records sorted descending on reference', async () => {
  const params: Params = {
    sort: { property: 'r', compare: 'desc' }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record1, record0] } });
});

test('get - all records sorted custom on identifier', async () => {
  const params: Params = {
    sort: {
      property: 'i',
      compare: function (a: any, b: any) {
        if (a === null || a.length === 0) {
          return b === null || b.length === 0 ? 0 : 1;
        } else {
          return b === null || b.length === 0 ? -1 : a[0].localeCompare(b[0]);
        }
      }
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({ ...sortAllExpected, ...{ items: [record0, record1] } });
});

test('get - not one record', async () => {
  const params: Params = {
    query: {
      selector: ['p'],
      operator: '!=',
      args: 16376412
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - some records', async () => {
  const params: Params = {
    query: {
      selector: ['p'],
      operator: 'in',
      args: [10042537, 10042538, 10042539]
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - some records with invalid selector', async () => {
  const params: Params = {
    query: {
      selector: ['p', 'x', 'y', 'z'],
      operator: 'in',
      args: [10042537, 10042538, 10042539]
    }
  };
  await expect(api.getRecords(params)).rejects.toThrow("value '10042538' is of type 'number' instead of 'object'");
});

test('get - some records using wildcard selector part with has_any', async () => {
  const params: Params = {
    query: {
      selector: ['s', '*', 'GT', 't'],
      operator: 'has_any',
      args: ['hom_a', 'hom_r']
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - some records using wildcard selector part with !has_any', async () => {
  const params: Params = {
    query: {
      selector: ['s', '*', 'GT', 't'],
      operator: '!has_any',
      args: ['hom_a', 'hom_r']
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record1],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - some records using composed query', async () => {
  const params: Params = {
    query: {
      operator: 'or',
      args: [
        {
          selector: 'p',
          operator: '==',
          args: 10042538
        },
        {
          selector: 'r',
          operator: '==',
          args: 'G'
        }
      ]
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0, record1],
    page: { number: 0, size: 10, totalElements: 2 },
    total: 2
  });
});

test('get - not some records', async () => {
  const params: Params = {
    query: {
      selector: ['p'],
      operator: '!in',
      args: [16376411, 16376412, 16376413]
    }
  };
  const records = await api.getRecords(params);
  expect(records).toEqual({
    items: [record0],
    page: { number: 0, size: 10, totalElements: 1 },
    total: 2
  });
});

test('get - all phenotypes', async () => {
  const phenotypes = await api.getPhenotypes();
  expect(phenotypes).toEqual({
    items: [],
    page: { number: 0, size: 10, totalElements: 0 },
    total: 0
  });
});

test('getVcfGz', async () => {
  const vcfGz = await api.getVcfGz();
  // null check, because size check differs between local machine and Travis
  expect(vcfGz).not.toBe(null);
});

test('getFastaGz', async () => {
  const fastaGz = await api.getFastaGz('1', 17350550);
  // null check, because size check differs between local machine and Travis
  expect(fastaGz).not.toBe(null);
});

test('getFastaGz - unknown interval', async () => {
  const fastaGz = await api.getFastaGz('1', 17350450);
  // null check, because size check differs between local machine and Travis
  expect(fastaGz).toBe(null);
});

test('getFastaGz - existing interval in other contig', async () => {
  const fastaGz = await api.getFastaGz('1', 47637250);
  expect(fastaGz).toBe(null);
});

test('getGenesGz', async () => {
  const genesGz = await api.getGenesGz();
  // null check, because size check differs between local machine and Travis
  expect(genesGz).not.toBe(null);
});

test('getBam', async () => {
  const bam = await api.getBam();
  // null check, because size check differs between local machine and Travis
  expect(bam).not.toBe(null);
});

test('getBai', async () => {
  const bai = await api.getBai();
  // null check, because size check differs between local machine and Travis
  expect(bai).not.toBe(null);
});
