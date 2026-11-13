# Why M becomes Gaussian

$M = \sum_i s_i$ is a sum of $N$ **independent, identically distributed** spins with
$\langle s_i \rangle = 0$ and $\mathrm{Var}(s_i) = \tfrac14$ (at $h=0$, $p=\tfrac12$).
The central limit theorem needs exactly these two ingredients — independence and finite
variance — so $\Pr(M)$ approaches a Gaussian with $\langle M \rangle = 0$ and
$\sigma_M^2 = \tfrac{N}{4}$.

Two widths grow in opposite directions. The **absolute** width $\sigma_M = \tfrac12\sqrt{N}$
*grows*: fluctuations of $M$ get larger with $N$. The **relative** width
$\sigma_M/N = 1/(2\sqrt N)$ *shrinks*: per spin, the magnetization $M/N$ is pinned ever
more sharply at its mean. This is why macroscopic observables look deterministic — the
thermodynamic limit (Plot B, the figure from the lecture).

Where it fails: $N$ of order one (Plot A at $N=1$ is two spikes, not a bell); the far
tails, which the Gaussian underestimates; and strongly biased chains ($p$ near 0 or 1),
where the distribution is skewed and Poisson-like until $Np(1-p)$ is large — the CLT is
then true but slow (preset c).

*Source: lecture1.pdf §4; Lecture notes 2.pdf p.2.*
