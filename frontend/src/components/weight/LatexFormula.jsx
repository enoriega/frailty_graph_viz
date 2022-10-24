import { MathJaxContext, MathJax } from 'better-react-mathjax';

export function generateLatexCode(coefficients) {

  const {
    frequency, hasSignificance, avgImpactFactor, maxImpactFactor, pValue
  } = coefficients;

  let latex = `\\begin{equation}
                  \\textbf{weight} = ${frequency === 1 ? "" : frequency}\\log(F + 1) + ${hasSignificance === 1 ? "" : hasSignificance} S + ${avgImpactFactor === 1 ? "" : avgImpactFactor} I_a + ${maxImpactFactor === 1 ? "" : maxImpactFactor} I_m + ${pValue === 1 ? "" : pValue} (1 - p) \\\\
                \\end{equation}`

  return latex
}

export default function LatexFormula({ coefficients }) {

  const latex = generateLatexCode(coefficients);

  return (
    <MathJaxContext>
      <div className="latex-formula"><MathJax dynamic={true}>{latex}</MathJax></div>
    </MathJaxContext>
  )
}