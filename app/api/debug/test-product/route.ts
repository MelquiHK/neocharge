import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Test 1: Check if user is authenticated
    console.log('\n=== TEST 1: Authentication ===')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('User:', user?.id)
    console.log('Auth Error:', authError)

    if (!user) {
      return NextResponse.json({ error: 'No user authenticated' }, { status: 401 })
    }

    // Test 2: Check profile
    console.log('\n=== TEST 2: Check Profile ===')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    console.log('Profile:', profile)
    console.log('Profile Error:', profileError)

    // Test 3: Check products table structure
    console.log('\n=== TEST 3: Products Table Info ===')
    const { data: tableInfo, error: tableError } = await supabase
      .from('products')
      .select()
      .limit(1)
    console.log('Table accessible:', !tableError)
    console.log('Table Error:', tableError)

    // Test 4: Try to insert a test product
    console.log('\n=== TEST 4: Insert Test Product ===')
    const testProduct = {
      name: 'Test Product ' + Date.now(),
      slug: 'test-' + Date.now(),
      description: 'Test description',
      price: 99.99,
      stock: 10,
      is_active: true,
    }
    
    console.log('Inserting:', testProduct)
    
    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert([testProduct])
      .select()

    console.log('Insert Result:', inserted)
    console.log('Insert Error:', insertError)

    if (insertError) {
      return NextResponse.json({
        error: 'Insert failed',
        details: insertError,
        testProduct,
      }, { status: 400 })
    }

    // Test 5: Try to query it back
    console.log('\n=== TEST 5: Query Back ===')
    const { data: queried, error: queryError } = await supabase
      .from('products')
      .select('*')
      .eq('id', inserted?.[0]?.id)
      .single()

    console.log('Query Result:', queried)
    console.log('Query Error:', queryError)

    return NextResponse.json({
      success: true,
      tests: {
        authenticated: !!user,
        hasProfile: !!profile,
        tableAccessible: !tableError,
        insertWorked: !insertError,
        queryWorked: !queryError,
      },
      inserted,
      details: {
        user: user?.id,
        profile,
        insertError,
        queryError,
      },
    })
  } catch (err) {
    console.error('Test error:', err)
    return NextResponse.json({
      error: 'Test failed',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
