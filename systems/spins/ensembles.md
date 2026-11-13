# Why two ensembles agree

**Microcanonical:** isolate the chain at energy $E$. The statistical postulate says all
$W(E) = \binom{N}{N_\downarrow}$ microstates are equally likely, and $S = k_B \ln W$.
Temperature is not an input — it *emerges* from the slope,
$\beta h = \partial \ln W/\partial (E/h) = \ln(N_\uparrow/N_\downarrow)$. Because $W$ peaks at
$E = 0$ and then falls, the slope turns negative: more than half the spins flipped against
the field means **negative temperature** (Chandler Ex. 3.5). That is only possible because
the spectrum is bounded above.

**Canonical:** couple the chain to a bath at fixed $\beta$ instead. Expanding
$\ln\Omega_{\text{bath}}(E_{\text{tot}}-E_\nu)$ gives $P_\nu \propto e^{-\beta E_\nu}$
(Chandler §3.3), so spins are independent with $p_\uparrow = 1/(1+e^{-\beta h})$ — the
biased chain of the CLT page, now with $p$ earned rather than set by hand.

**Equivalence:** energy is fixed in one ensemble and fluctuates in the other, but the
relative fluctuation $\sqrt{\langle\delta M^2\rangle}/\langle M\rangle \propto 1/\sqrt N$
vanishes for large $N$ — check it in the readouts. The fluctuation itself is physical:
$\langle\delta M^2\rangle = \partial\langle M\rangle/\partial(\beta h)$, fluctuation =
susceptibility (Ex. 3.19).

*Units here: $k_B = 1$, $h$ sets the energy scale. Sources: Lecture notes 3;
Ensembles.pdf (Chandler) §3.3–3.4, Ex. 3.5, 3.18–3.20.*
