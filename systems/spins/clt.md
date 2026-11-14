# Why M becomes Gaussian

Conventions on this and the Entropy page: $\ell$ is the **length of one chain** (number
of spins), $N$ is the **number of chains sampled**. The CLT convergence below is in
$\ell$; $N$ only controls the sampling noise of the histograms.

$M = \sum_i s_i$ is a sum of $\ell$ **independent, identically distributed** spins with
$\langle s_i \rangle = 0$ and $\mathrm{Var}(s_i) = \tfrac14$ (at $h=0$, $p=\tfrac12$).
The central limit theorem needs exactly these two ingredients — independence and finite
variance — so $\Pr(M)$ approaches a Gaussian with $\langle M \rangle = 0$ and
$\sigma_M^2 = \tfrac{\ell}{4}$.

**What $h$ is.** $h$ is an external magnetic field that couples to each spin with energy
$-h\,s_i$ (units $k_B = 1$; $h$ sets the energy scale). A field $h > 0$ lowers the energy
of ↑, so up becomes the more likely state — the field *biases* the chain, pushing $p$
above $\tfrac12$ ($h < 0$ pushes it below). With no field, $h = 0$, both orientations are
equally likely and $p = \tfrac12$. On this page the bias is set by hand through $p$; the
quantitative link $p = 1/(1+e^{-\beta h})$ is earned on the Ensembles page.

Two widths grow in opposite directions. The **absolute** width $\sigma_M = \tfrac12\sqrt{\ell}$
*grows*: fluctuations of $M$ get larger with $\ell$. The **relative** width
$\sigma_M/\ell = 1/(2\sqrt \ell)$ *shrinks*: per spin, the magnetization $M/\ell$ is pinned
ever more sharply at its mean. This is why macroscopic observables look deterministic — the
thermodynamic limit (Plot B, the figure from the lecture).

Where it fails: $\ell$ of order one (Plot A at $\ell=1$ is two spikes, not a bell); the far
tails, which the Gaussian underestimates; and strongly biased chains ($p$ near 0 or 1),
where the distribution is skewed and Poisson-like until $\ell p(1-p)$ is large — the CLT is
then true but slow (preset c).

*Source: lecture1.pdf §4; Lecture notes 2.pdf p.2.*
