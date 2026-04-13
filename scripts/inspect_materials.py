"""Inspect PBR material properties on Ruth2 GLB."""
import bpy
import sys

filepath = sys.argv[sys.argv.index("--") + 1]

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=filepath)

print(f"\n{'='*80}")
print("MATERIAL PROPERTIES")
print(f"{'='*80}")

for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    for slot in obj.material_slots:
        mat = slot.material
        if not mat or not mat.use_nodes:
            continue
        # Find Principled BSDF node
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                base = node.inputs.get('Base Color')
                metal = node.inputs.get('Metallic')
                rough = node.inputs.get('Roughness')
                alpha = node.inputs.get('Alpha')

                base_val = tuple(base.default_value) if base else 'N/A'
                metal_val = metal.default_value if metal else 'N/A'
                rough_val = rough.default_value if rough else 'N/A'
                alpha_val = alpha.default_value if alpha else 'N/A'

                # Check for connected textures
                base_tex = 'none'
                if base and base.links:
                    linked = base.links[0].from_node
                    if linked.type == 'TEX_IMAGE' and linked.image:
                        base_tex = linked.image.name

                print(f"  {obj.name:40s} | {mat.name:25s} | metal={metal_val:.3f} rough={rough_val:.3f} alpha={alpha_val:.3f} base_color={base_val[0]:.2f},{base_val[1]:.2f},{base_val[2]:.2f} tex={base_tex}")
                break

print(f"{'='*80}\n")
