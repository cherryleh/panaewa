export interface PropagationStep {
  number: number;
  text: string;
  images: string[];
}

export interface PropagationGuide {
  id: string;
  name: string;
  accent: string;
  subtitle: string;
  materials: string[];
  steps: PropagationStep[];
}

export const PROPAGATION_GUIDES: PropagationGuide[] = [
  {
    id: 'awa',
    name: 'ʻAwa',
    accent: '#6b5b95',
    subtitle: 'Propagation by cutting — KPFA propagation workshop, January 2025. Keaʻahuli O Panaʻewa project site, Panaʻewa, Hawaiʻi. Photos by Torri Law.',
    materials: [
      'Clippers or shears (sterilized)',
      'Cinder or perlite',
      'Potting soil',
      'Fertilizer',
      '1-gallon pot',
      'Sphagnum moss'
    ],
    steps: [
      {
        number: 1,
        text: 'ʻAwa is propagated using cuttings of a mature plant’s branches. The branches consist of two parts: nodes and internodes. Nodes are the “joints” of the branch where leaves and new branches can sprout. Internodes are the sections of branch between the nodes.',
        images: ['awa-1-mature-plant.jpg']
      },
      {
        number: 2,
        text: 'Using sterilized clippers, remove a branch from a mature plant. Clean tools improve the chances of a successful propagation. Next, identify the sprouting point of each node — this tiny outgrowth will grow into a new ʻawa plant.',
        images: ['awa-2-cutting.jpg', 'awa-2-node-closeup.jpg']
      },
      {
        number: 3,
        text: 'Orient the branch so the sprout faces up, then cut the internodes at a 45-degree angle on both sides. Both cuts should be angled so the newly exposed surface faces downward — this prevents water from collecting on the cut surfaces and causing rot.',
        images: ['awa-3-angled-cuts.jpg']
      },
      {
        number: 4,
        text: 'Prepare a dampened mix of cinder and soil, and sprinkle in some fertilizer. Place the cutting in the soil mix with the sprout facing up, then cover with a layer of damp — but not saturated — sphagnum moss, leaving only the sprout exposed to sunlight.',
        images: ['awa-4-potting.jpg']
      },
      {
        number: 5,
        text: 'Keep the cutting in 70–80% shade for the first few months, and avoid overwatering. A new ʻawa plant will start to sprout from the exposed node within a few weeks.',
        images: ['awa-5-shade.jpg']
      }
    ]
  },
  {
    id: 'ulu',
    name: 'ʻUlu',
    accent: '#5a7d3a',
    subtitle: 'Propagation by air-layering — KPFA propagation workshop, August 2024. Keaʻahuli O Panaʻewa project site, Panaʻewa, Hawaiʻi. Photos by Torri Law.',
    materials: [
      'Sterilized knife (preferably with a hooked blade)',
      'Sphagnum moss',
      'Plastic wrap',
      'String or rubber band',
      'Aluminum foil',
      'Rooting hormone (optional)'
    ],
    steps: [
      {
        number: 1,
        text: 'One of the many ways ʻulu can be propagated is by “air-layering.” Through this process, branches of a mature tree are encouraged to sprout roots. Once these roots develop, the branch is cut from the parent tree and replanted. This method can be done year-round, as long as the tree is not fruiting.',
        images: ['ulu-1-tree.jpg']
      },
      {
        number: 2,
        text: 'Begin by selecting a suitable branch — ideal branches will be about an inch thick. Next, identify the node where the branch transitions from green growth (towards the tip) to brown and woody (towards the trunk). From that spot, move downward at least four nodes; this will be the ideal place to encourage rooting.',
        images: ['ulu-2-select-branch.jpg']
      },
      {
        number: 3,
        text: 'Using a sterilized blade, carefully make two incisions all the way around the branch: one above the rooting node, and one below. The incisions should be about halfway between the rooting node and its neighbors, and only as deep as the outer bark.',
        images: ['ulu-3-incision.jpg']
      },
      {
        number: 4,
        text: 'Gently peel away the outer bark between the incisions, exposing the bast (inner bark). Then scrape away the waxy outer layer of the bast.',
        images: ['ulu-4-peel-bark-1.jpg', 'ulu-4-peel-bark-2.jpg']
      },
      {
        number: 5,
        text: 'Squeeze any excess moisture from the sphagnum moss and wrap it around the exposed bark. The moss should look like a softball-sized lump around the branch. Rooting hormone is not necessary, but can be added to the moss if desired.',
        images: ['ulu-5-moss.jpg']
      },
      {
        number: 6,
        text: 'Cover the moss with several layers of plastic wrap, twisting the ends around the branch like a candy wrapper. Tie the twisted ends tightly with a rubber band or string to keep moisture in, then cover with foil to keep it dark.',
        images: ['ulu-6-wrap.jpg']
      },
      {
        number: 7,
        text: 'The developing root ball may attract ants, so this is a good time to treat for pests. New roots will emerge after 8–12 weeks and can be felt when squeezing the foil ball. Once the new roots are established, remove the branch from the parent tree and replant it — cutting at a 45-degree angle with sterilized tools to protect the parent tree from disease and rot.',
        images: ['ulu-7-foil.jpg']
      }
    ]
  }
];
